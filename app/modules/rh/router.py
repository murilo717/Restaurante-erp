from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import usuario_atual, exige_perfis, Perfil
from app.modules.rh.schemas import (
    FuncionarioOut,
    FuncionarioCriar,
    VincularUsuarioIn,
    PontoOut,
    BaterPontoIn,
    FolhaOut,
    GerarFolhaIn,
    VagaOut,
    VagaCriar,
    VagaStatusIn,
    CandidatoOut,
    CandidatoCriar,
    CandidatoEtapaIn,
)
from datetime import date

router = APIRouter(prefix="/rh", tags=["Recursos Humanos"])

# Apenas gestores administram funcionários e vínculos de acesso.
PERFIS_GESTAO = (Perfil.GERENTE,)


@router.get("/status")
async def status_rh(
    db: AsyncSession = Depends(get_db),
    _usuario: dict = Depends(usuario_atual),
):
    await db.execute(text("SELECT 1"))
    return {"modulo": "rh", "status": "disponivel"}


@router.get("/funcionarios", response_model=list[FuncionarioOut])
async def listar_funcionarios(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    r = await db.execute(text("""
        SELECT f.funcionario_id, f.nome, f.cpf, f.cargo, f.salario,
               f.data_admissao, f.ativo, u.login AS usuario_login
        FROM rh.funcionarios f
        LEFT JOIN sys.usuarios u ON u.funcionario_id = f.funcionario_id
        ORDER BY f.nome
    """))
    return r.mappings().all()


@router.post("/funcionarios", response_model=FuncionarioOut, status_code=201)
async def criar_funcionario(
    dados: FuncionarioCriar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    try:
        r = await db.execute(text("""
            INSERT INTO rh.funcionarios (nome, cpf, cargo, salario)
            VALUES (:nome, :cpf, :cargo, :salario)
            RETURNING funcionario_id, nome, cpf, cargo, salario,
                      data_admissao, ativo
        """), dados.model_dump())
        linha = dict(r.mappings().one())
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Já existe um funcionário com esse CPF",
        )
    linha["usuario_login"] = None
    return linha


@router.post("/funcionarios/{funcionario_id}/vincular-usuario")
async def vincular_usuario(
    funcionario_id: int,
    dados: VincularUsuarioIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    """Associa o login de um usuário a este funcionário.

    Depois disso, quando esse usuário abrir um pedido, ele será registrado
    sob este funcionário.
    """
    # Funcionário existe?
    func = (await db.execute(
        text("SELECT nome FROM rh.funcionarios WHERE funcionario_id = :id"),
        {"id": funcionario_id},
    )).scalar()
    if func is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Funcionário não encontrado")

    # Usuário existe?
    usuario_id = (await db.execute(
        text("SELECT usuario_id FROM sys.usuarios WHERE login = :l"),
        {"l": dados.login},
    )).scalar()
    if usuario_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")

    # Esse funcionário já está vinculado a outro usuário?
    outro = (await db.execute(
        text("""
            SELECT login FROM sys.usuarios
            WHERE funcionario_id = :fid AND usuario_id <> :uid
        """),
        {"fid": funcionario_id, "uid": usuario_id},
    )).scalar()
    if outro is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Este funcionário já está vinculado ao usuário '{outro}'",
        )

    await db.execute(text("""
        UPDATE sys.usuarios SET funcionario_id = :fid WHERE usuario_id = :uid
    """), {"fid": funcionario_id, "uid": usuario_id})
    await db.commit()

    return {
        "funcionario_id": funcionario_id,
        "funcionario_nome": func,
        "usuario_login": dados.login,
        "mensagem": "Usuário vinculado ao funcionário com sucesso.",
    }


# ===========================================================================
# Ponto eletrônico (rh.ponto)
# ===========================================================================

# Qualquer funcionário da operação bate ponto; gestão vê tudo.
PERFIS_PONTO = (Perfil.GARCOM, Perfil.COZINHA, Perfil.GERENTE, Perfil.SUPERVISOR)


@router.get("/ponto", response_model=list[PontoOut])
async def listar_ponto(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_PONTO)),
):
    r = await db.execute(text("""
        SELECT p.ponto_id, p.funcionario_id, f.nome AS funcionario_nome,
               p.entrada, p.saida
        FROM rh.ponto p
        JOIN rh.funcionarios f ON f.funcionario_id = p.funcionario_id
        ORDER BY p.entrada DESC
        LIMIT 100
    """))
    return r.mappings().all()


@router.post("/ponto/entrada", response_model=PontoOut, status_code=201)
async def bater_entrada(
    dados: BaterPontoIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_PONTO)),
):
    # Bloqueia se já houver um ponto em aberto (entrada sem saída).
    aberto = (await db.execute(text("""
        SELECT ponto_id FROM rh.ponto
        WHERE funcionario_id = :f AND saida IS NULL
        ORDER BY entrada DESC LIMIT 1
    """), {"f": dados.funcionario_id})).scalar()
    if aberto is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Já existe um ponto em aberto para este funcionário",
        )

    func = (await db.execute(
        text("SELECT 1 FROM rh.funcionarios WHERE funcionario_id = :f AND ativo"),
        {"f": dados.funcionario_id},
    )).scalar()
    if not func:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Funcionário não encontrado ou inativo")

    ponto_id = (await db.execute(text("""
        INSERT INTO rh.ponto (funcionario_id, entrada) VALUES (:f, now())
        RETURNING ponto_id
    """), {"f": dados.funcionario_id})).scalar()
    await db.commit()
    return await _buscar_ponto(db, ponto_id)


@router.post("/ponto/saida", response_model=PontoOut)
async def bater_saida(
    dados: BaterPontoIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_PONTO)),
):
    aberto = (await db.execute(text("""
        SELECT ponto_id FROM rh.ponto
        WHERE funcionario_id = :f AND saida IS NULL
        ORDER BY entrada DESC LIMIT 1
    """), {"f": dados.funcionario_id})).scalar()
    if aberto is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Não há ponto em aberto para registrar a saída",
        )
    await db.execute(text("""
        UPDATE rh.ponto SET saida = now() WHERE ponto_id = :id
    """), {"id": aberto})
    await db.commit()
    return await _buscar_ponto(db, aberto)


async def _buscar_ponto(db: AsyncSession, ponto_id: int):
    r = await db.execute(text("""
        SELECT p.ponto_id, p.funcionario_id, f.nome AS funcionario_nome,
               p.entrada, p.saida
        FROM rh.ponto p
        JOIN rh.funcionarios f ON f.funcionario_id = p.funcionario_id
        WHERE p.ponto_id = :id
    """), {"id": ponto_id})
    return r.mappings().first()


# ===========================================================================
# Folha de pagamento (rh.folha_pagamento + procedure rh.gerar_folha)
# ===========================================================================

@router.get("/folha", response_model=list[FolhaOut])
async def listar_folha(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    r = await db.execute(text("""
        SELECT fp.folha_id, fp.funcionario_id, f.nome AS funcionario_nome,
               fp.competencia, fp.salario_bruto, fp.desconto_inss,
               fp.desconto_irrf, fp.desconto_beneficios, fp.salario_liquido
        FROM rh.folha_pagamento fp
        JOIN rh.funcionarios f ON f.funcionario_id = fp.funcionario_id
        ORDER BY fp.competencia DESC, f.nome
    """))
    return r.mappings().all()


@router.post("/folha/gerar", response_model=list[FolhaOut], status_code=201)
async def gerar_folha(
    dados: GerarFolhaIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    """Gera a folha de todos os funcionários ativos para a competência.

    A procedure rh.gerar_folha normaliza a data para o 1º dia do mês e usa
    ON CONFLICT DO NOTHING (não duplica folhas já geradas).
    """
    comp = dados.competencia or date.today()
    await db.execute(text("CALL rh.gerar_folha(:c)"), {"c": comp})
    await db.commit()

    # Retorna a folha da competência normalizada (1º dia do mês).
    r = await db.execute(text("""
        SELECT fp.folha_id, fp.funcionario_id, f.nome AS funcionario_nome,
               fp.competencia, fp.salario_bruto, fp.desconto_inss,
               fp.desconto_irrf, fp.desconto_beneficios, fp.salario_liquido
        FROM rh.folha_pagamento fp
        JOIN rh.funcionarios f ON f.funcionario_id = fp.funcionario_id
        WHERE fp.competencia = date_trunc('month', CAST(:c AS date))::date
        ORDER BY f.nome
    """), {"c": comp})
    return r.mappings().all()


# ===========================================================================
# Recrutamento: vagas e candidatos
# ===========================================================================

@router.get("/vagas", response_model=list[VagaOut])
async def listar_vagas(
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    r = await db.execute(text("""
        SELECT v.vaga_id, v.cargo, v.descricao, v.status, v.aberta_em,
               (SELECT COUNT(*) FROM rh.candidatos c WHERE c.vaga_id = v.vaga_id)
               AS qtd_candidatos
        FROM rh.vagas v
        ORDER BY v.aberta_em DESC, v.vaga_id DESC
    """))
    return r.mappings().all()


@router.post("/vagas", response_model=VagaOut, status_code=201)
async def criar_vaga(
    dados: VagaCriar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    vaga_id = (await db.execute(text("""
        INSERT INTO rh.vagas (cargo, descricao) VALUES (:cargo, :descricao)
        RETURNING vaga_id
    """), dados.model_dump())).scalar()
    await db.commit()
    return await _buscar_vaga(db, vaga_id)


@router.patch("/vagas/{vaga_id}/status", response_model=VagaOut)
async def alterar_status_vaga(
    vaga_id: int,
    dados: VagaStatusIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    r = await db.execute(text("""
        UPDATE rh.vagas SET status = :st WHERE vaga_id = :id RETURNING vaga_id
    """), {"st": dados.status, "id": vaga_id})
    if r.first() is None:
        await db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vaga não encontrada")
    await db.commit()
    return await _buscar_vaga(db, vaga_id)


async def _buscar_vaga(db: AsyncSession, vaga_id: int):
    r = await db.execute(text("""
        SELECT v.vaga_id, v.cargo, v.descricao, v.status, v.aberta_em,
               (SELECT COUNT(*) FROM rh.candidatos c WHERE c.vaga_id = v.vaga_id)
               AS qtd_candidatos
        FROM rh.vagas v WHERE v.vaga_id = :id
    """), {"id": vaga_id})
    return r.mappings().first()


@router.get("/vagas/{vaga_id}/candidatos", response_model=list[CandidatoOut])
async def listar_candidatos(
    vaga_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    r = await db.execute(text("""
        SELECT candidato_id, vaga_id, nome, email, etapa, criado_em
        FROM rh.candidatos WHERE vaga_id = :id ORDER BY criado_em
    """), {"id": vaga_id})
    return r.mappings().all()


@router.post("/vagas/{vaga_id}/candidatos", response_model=CandidatoOut, status_code=201)
async def criar_candidato(
    vaga_id: int,
    dados: CandidatoCriar,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    existe = (await db.execute(
        text("SELECT 1 FROM rh.vagas WHERE vaga_id = :id"), {"id": vaga_id}
    )).scalar()
    if not existe:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vaga não encontrada")

    cid = (await db.execute(text("""
        INSERT INTO rh.candidatos (vaga_id, nome, email)
        VALUES (:v, :nome, :email) RETURNING candidato_id
    """), {"v": vaga_id, "nome": dados.nome, "email": dados.email})).scalar()
    await db.commit()
    return await _buscar_candidato(db, cid)


@router.patch("/candidatos/{candidato_id}/etapa", response_model=CandidatoOut)
async def mover_etapa_candidato(
    candidato_id: int,
    dados: CandidatoEtapaIn,
    db: AsyncSession = Depends(get_db),
    _=Depends(exige_perfis(*PERFIS_GESTAO)),
):
    r = await db.execute(text("""
        UPDATE rh.candidatos SET etapa = :e WHERE candidato_id = :id
        RETURNING candidato_id
    """), {"e": dados.etapa, "id": candidato_id})
    if r.first() is None:
        await db.rollback()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidato não encontrado")
    await db.commit()
    return await _buscar_candidato(db, candidato_id)


async def _buscar_candidato(db: AsyncSession, candidato_id: int):
    r = await db.execute(text("""
        SELECT candidato_id, vaga_id, nome, email, etapa, criado_em
        FROM rh.candidatos WHERE candidato_id = :id
    """), {"id": candidato_id})
    return r.mappings().first()
