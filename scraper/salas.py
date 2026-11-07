"""Locais da consulta pública geral; nenhuma inferência por nome de disciplina."""

import re

from bs4 import BeautifulSoup


def normalizar_texto(texto):
    return " ".join(texto.split())


def normalizar_sala(texto):
    texto = normalizar_texto(texto)
    if texto.casefold() in {
        "", "-", ".", "a definir", "não informado", "não informada",
        "nao informado", "nao informada",
    }:
        return None
    return texto


def normalizar_docente(texto):
    # A listagem geral acrescenta a carga horária ao nome do docente.
    texto = re.sub(r"\(\d+(?:[.,]\d+)?\s*h\)", " ", texto, flags=re.I)
    return normalizar_texto(texto).casefold()


def chave_turma(codigo, turma, periodo, docente):
    return (
        codigo.strip(), turma.strip(), periodo.strip(), normalizar_docente(docente),
    )


def extrair_salas(html):
    soup = BeautifulSoup(html, "html.parser")
    locais = {}
    for tabela in soup.select("table.listagem"):
        cabecalhos = [normalizar_texto(th.get_text()).casefold()
                      for th in tabela.select("thead th")]
        if "local" not in cabecalhos:
            continue
        indice_local = cabecalhos.index("local")
        codigo = None
        for linha in tabela.select("tbody > tr"):
            titulo = linha.select_one(".tituloDisciplina")
            if titulo:
                codigo = titulo.get_text(" ", strip=True).split(" - ", 1)[0]
                continue
            numero = linha.select_one("td.turma")
            periodo = linha.select_one("td.anoPeriodo")
            docente = linha.select_one("td.nome")
            celulas = linha.find_all("td", recursive=False)
            if not codigo or numero is None or periodo is None or docente is None:
                continue
            if len(celulas) <= indice_local:
                continue
            chave = chave_turma(codigo, numero.get_text(), periodo.get_text(),
                                docente.get_text(" ", strip=True))
            sala = normalizar_sala(celulas[indice_local].get_text(" ", strip=True))
            # Registros repetidos com locais divergentes são ambíguos.
            locais.setdefault(chave, set()).add(sala)
    return locais


DIAS_LOCAIS = {
    "SEG": 2, "SEGUNDA": 2,
    "TER": 3, "TERÇA": 3, "TERCA": 3,
    "QUA": 4, "QUARTA": 4,
    "QUI": 5, "QUIN": 5, "QUINT": 5, "QUINTA": 5,
    "SEX": 6, "SEXTA": 6,
    "SAB": 7, "SÁB": 7, "SABADO": 7, "SÁBADO": 7,
    "DOM": 1, "DOMINGO": 1,
}
PADRAO_DIA = re.compile(
    r"\b(" + "|".join(sorted(DIAS_LOCAIS, key=len, reverse=True))
    + r")\b\.?\s*[-:]?\s*", re.I,
)


def salas_por_dia(texto):
    """Aceita só sequências explícitas DIA SALA/LAB; texto livre é preservado."""
    marcadores = list(PADRAO_DIA.finditer(texto))
    if not marcadores or texto[:marcadores[0].start()].strip():
        return {}
    salas = {}
    for indice, marcador in enumerate(marcadores):
        fim = marcadores[indice + 1].start() if indice + 1 < len(marcadores) else len(texto)
        local = texto[marcador.end():fim].strip()
        local = re.sub(r"\s+E\s*$", "", local, flags=re.I).rstrip(" -;,.")
        # Turnos, alternativas e descrições não estruturadas não são interpretados.
        if not re.match(r"^(?:SALA\b|LAB(?:\.|\b)|LABORAT[ÓO]RIO\b)", local, re.I):
            return {}
        if re.search(r"\b(?:MANH[ÃA]|TARDE|NOITE|OU)\b", local, re.I):
            return {}
        dia = DIAS_LOCAIS[marcador.group(1).upper()]
        if dia in salas:
            return {}
        salas[dia] = local
    return salas


def enriquecer_turmas_com_salas(resultados, locais):
    for curso in resultados:
        for turma in curso["turmas"]:
            chave = chave_turma(turma["codigo"], turma["turma"],
                                turma["periodo"], turma["docente"])
            candidatos = locais.get(chave, set())
            sala = next(iter(candidatos)) if len(candidatos) == 1 else None
            turma["sala"] = sala
            # Enriquecimento sempre parte dos horários atuais, sem carregar salas antigas.
            for horario in turma["horarios"]:
                horario.pop("sala", None)
            if sala:
                por_dia = salas_por_dia(sala)
                if por_dia:
                    for horario in turma["horarios"]:
                        horario["sala"] = por_dia.get(horario["dia"])
