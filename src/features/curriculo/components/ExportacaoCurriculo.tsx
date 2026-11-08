import { useEffect, useRef, useState } from 'react'
import type { ExportacaoCurriculo as DadosExportacao } from '../models/types'
import { exportarCurriculoCsv } from '../exportacao/exportarCurriculoCsv'

export default function ExportacaoCurriculo({ dados }: { dados: DadosExportacao }) {
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const ativo = useRef(true)
  useEffect(() => { ativo.current = true; return () => { ativo.current = false } }, [])
  const modo = dados.modo
  async function baixar(formato: 'pdf' | 'csv') {
    if (ocupado) return
    setOcupado(true); setMensagem('')
    try {
      const atual = { ...dados, geradoEm: new Date().toISOString() }
      if (formato === 'pdf') {
        const { exportarCurriculoPdf } = await import('../exportacao/exportarCurriculoPdf')
        if (!ativo.current) return
        exportarCurriculoPdf(atual)
      } else exportarCurriculoCsv(atual)
      setMensagem(`${formato.toUpperCase()} gerado ${dados.modo === 'progresso' ? 'com progresso acadêmico' : 'sem dados do histórico'}.`)
    } catch { if (ativo.current) setMensagem('Não foi possível gerar o arquivo. Confira a estrutura e tente novamente.') }
    finally { if (ativo.current) setOcupado(false) }
  }
  return <section className="curriculo-exportacao" aria-label="Exportar estrutura curricular">
    <p><strong>Exportar estrutura curricular</strong> · {modo === 'progresso' ? 'Com progresso acadêmico' : 'Sem dados do histórico'}</p>
    <div><button type="button" disabled={ocupado} onClick={() => baixar('pdf')}>Baixar PDF</button><button type="button" disabled={ocupado} onClick={() => baixar('csv')}>Baixar CSV</button></div>
    <p role="status" aria-live="polite">{ocupado ? 'Gerando arquivo neste navegador…' : mensagem}</p>
  </section>
}
