from pathlib import Path
from unittest.mock import Mock

import pytest
import requests

from scraper.salas import (
    chave_turma, enriquecer_turmas_com_salas, extrair_salas,
    normalizar_sala, salas_por_dia,
)
from scraper.scraper import (
    coletar_turmas_dos_cursos, consultar_salas, extrair_turmas, salvar_dados_cursos,
)


FIXTURES = Path(__file__).parent / "fixtures"


def html_salas():
    return (FIXTURES / "salas-cct-2026-2.html").read_text()


def turmas_reais():
    return extrair_turmas((FIXTURES / "turmas-cc-2026-2.html").read_text())


def test_extracao_real_associacao_por_codigo_numero_periodo_docente():
    resultados = [{"turmas": turmas_reais()}]
    enriquecer_turmas_com_salas(resultados, extrair_salas(html_salas()))
    turmas = resultados[0]["turmas"]
    redes = next(t for t in turmas if t["codigo"] == "CC0024")
    assert redes["sala"] == "SALA K03"
    assert all("sala" not in h for h in redes["horarios"])
    labs = [t for t in turmas if t["codigo"] == "CC0062"]
    assert [t["sala"] for t in labs] == ["Lab. K04s", None]


def test_salas_por_encontro_apenas_quando_dia_explicito():
    turma = next(t for t in turmas_reais() if t["codigo"] == "CC0020")
    enriquecer_turmas_com_salas([{"turmas": [turma]}], extrair_salas(html_salas()))
    assert turma["sala"] == "TER SALA K04 E QUI.LAB. K02S"
    assert [(h["dia"], h["sala"]) for h in turma["horarios"]] == [
        (3, "SALA K04"), (5, "LAB. K02S"),
    ]


def test_texto_ambiguo_preservado_sem_inventar_associacoes():
    locais = extrair_salas(html_salas())
    sala = locais[chave_turma("EM0081", "01", "2026.2", "ROSIANE MARIA DA COSTA FARIAS")]
    assert sala == {"TER MANHÃ SALA A24S TARDE LAB. QUÍMICA"}
    assert salas_por_dia(next(iter(sala))) == {}
    assert salas_por_dia("SALA A E LABORATÓRIO B") == {}
    assert salas_por_dia("TER SALA A OU LAB B QUIN SALA C") == {}
    assert salas_por_dia("TER SALA A TER LAB B") == {}


def test_local_parcial_nao_estendido_a_outros_dias():
    turma = turmas_reais()[0]
    chave = chave_turma(turma["codigo"], turma["turma"], turma["periodo"], turma["docente"])
    enriquecer_turmas_com_salas([{"turmas": [turma]}], {chave: {"TER SALA A"}})
    assert [h["sala"] for h in turma["horarios"]] == ["SALA A", None]


@pytest.mark.parametrize("texto", ["", " \n ", "-", ".", "A DEFINIR", "Não informada"])
def test_local_ausente(texto):
    assert normalizar_sala(texto) is None


def test_normalizacao_preserva_bloco_laboratorio_e_caracteres():
    assert normalizar_sala(" \n Laboratório\u00a0 de  Física - Bloco B \t") == "Laboratório de Física - Bloco B"
    assert salas_por_dia("TER. LAB K02S QUINT. SALA I103") == {3: "LAB K02S", 5: "SALA I103"}


def test_local_a_definir_real():
    locais = extrair_salas(html_salas())
    assert locais[chave_turma("EM0121", "03", "2026.2", "HILLANE MIRELLE LOPES FERREIRA DE LIMA OLIVEIRA")] == {None}


def test_dados_antigos_multiplos_cursos_e_registros_divergentes():
    turma = turmas_reais()[0]
    turma.pop("sala")
    outro = {**turma, "periodo": "2026.1", "horarios": []}
    resultados = [{"turmas": [turma]}, {"turmas": [outro]}]
    chave = chave_turma(turma["codigo"], turma["turma"], turma["periodo"], turma["docente"])
    enriquecer_turmas_com_salas(resultados, {chave: {"SALA A", "SALA B"}})
    assert turma["sala"] is None
    assert outro["sala"] is None
    assert extrair_salas("<table id='table_lt'><tbody></tbody></table>") == {}


def test_docente_divergente_nao_recebe_local_de_outra_oferta():
    turma = turmas_reais()[0]
    turma["docente"] = "OUTRO DOCENTE"
    enriquecer_turmas_com_salas([{"turmas": [turma]}], extrair_salas(html_salas()))
    assert turma["sala"] is None


def test_extracao_agrega_locais_divergentes_sem_escolher_arbitrariamente():
    html = html_salas()
    locais = extrair_salas(html + html.replace("SALA K03", "SALA K99"))
    assert locais[chave_turma("CC0024", "01", "2026.2", "CAMILA HELENA SOUZA OLIVEIRA")] == {"SALA K03", "SALA K99"}


def test_fluxo_automatizado_e_json_sem_requisicoes_por_turma(monkeypatch, tmp_path):
    import json
    import scraper.scraper as scraper

    monkeypatch.setattr(scraper, "consultar_sigaa", Mock(return_value=(FIXTURES / "turmas-cc-2026-2.html").read_text()))
    monkeypatch.setattr(scraper, "DATA_DIR", tmp_path)
    resultados = coletar_turmas_dos_cursos([
        {"id": "32652294", "nome": "CIÊNCIA DA COMPUTAÇÃO", "sede": "Juazeiro do Norte", "modalidade": "Presencial"},
    ], "2026", "2")
    enriquecer_turmas_com_salas(resultados, extrair_salas(html_salas()))
    arquivo = salvar_dados_cursos(resultados, "2026", "2")
    dados = json.loads(arquivo.read_text())
    assert dados["periodo"] == "2026.2"
    assert dados["cursos"][0]["turmas"][0]["sala"]
    scraper.consultar_sigaa.assert_called_once_with("32652294", "2026", "2")


FORMULARIO = """<form id="formTurma" action="/sigaa/public/turmas/listar.jsf">
<input name="javax.faces.ViewState" value="estado">
<input type="submit" name="buscarDinamico" value="Buscar">
<select name="formTurma:inputDepto"><option value="0">Selecione</option>
<option value="62">CENTRO DE CIÊNCIAS E TECNOLOGIA</option>
<option value="55">CENTRO DE CIÊNCIAS SOCIAIS APLICADAS</option>
<option value="529">PROGRAMA DE PÓS-GRADUAÇÃO EM ADMINISTRAÇÃO</option>
</select></form>"""


def test_consulta_em_lotes_reutiliza_sessao_e_viewstate(monkeypatch):
    session = Mock()
    session.__enter__ = Mock(return_value=session)
    session.__exit__ = Mock(return_value=False)
    session.get.return_value = Mock(text=FORMULARIO, url="https://sig.ufca.edu.br/sigaa/public/turmas/listar.jsf")
    session.post.side_effect = [
        Mock(text=FORMULARIO.replace('value="estado"', 'value="novo"') + html_salas(), url=session.get.return_value.url),
        Mock(text=FORMULARIO, url=session.get.return_value.url),
    ]
    monkeypatch.setattr("scraper.scraper.criar_sessao", lambda: session)
    locais = consultar_salas("2026", "2")
    assert locais
    assert session.get.call_count == 1
    assert session.post.call_count == 2
    primeiro, segundo = [c.kwargs["data"] for c in session.post.call_args_list]
    assert primeiro["formTurma:inputDepto"] == "62"
    assert segundo["formTurma:inputDepto"] == "55"
    assert segundo["javax.faces.ViewState"] == "novo"
    assert primeiro["formTurma:inputAno"] == "2026"
    assert primeiro["formTurma:inputPeriodo"] == "2"
    assert primeiro["formTurma:inputNivel"] == "G"
    assert primeiro["buscarDinamico"] == "Buscar"


def test_consulta_indisponivel_nao_impede_coleta_principal(monkeypatch, capsys):
    session = Mock()
    session.__enter__ = Mock(return_value=session)
    session.__exit__ = Mock(return_value=False)
    session.get.side_effect = requests.ConnectionError("indisponível")
    monkeypatch.setattr("scraper.scraper.criar_sessao", lambda: session)
    monkeypatch.setattr("scraper.scraper.executar_com_retry", lambda operacao, descricao: operacao())
    assert consultar_salas("2026", "2") == {}
    assert "AVISO: locais indisponíveis" in capsys.readouterr().out
