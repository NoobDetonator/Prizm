# Prizm — Plano de Correção e Refatoração

**Repositório:** `NoobDetonator/Prizm`
**Stack:** Three.js 0.178, Vite 7, sem dependências extras
**Entry real:** `index.html` → `src/main.js`
**Branch de trabalho:** `cursor/fix-render-pipeline-44e4`
**Objetivo final:** material/shader de prisma reutilizável em qualquer geometria, com demo.

## Regras

- Fases na ordem **0 → 8**. Não pular.
- Um commit por tarefa: `[T#.#] o que mudou visualmente`.
- Critério de aceite = diferença visual verificável (não só "compila").
- Sem arquivos `V2` / `New` / `Final`. Editar o existente e deletar o que substituir.
- Sem dependências novas sem aprovação.
- Se uma correção não produzir diferença visual esperada, **parar e investigar**.

## Fases (resumo)

| Fase | Foco |
| --- | --- |
| 0 | Baseline, auditoria de sliders, perf |
| 1 | Bugs críticos (rim preto, cáusticas, cubeBack, streetwear opaco) |
| 2 | Pipeline pós (máscara na extração, ordem correta) |
| 3 | Environment HDR |
| 4 | Limpeza de órfãos |
| 5 | Performance |
| 6 | Biblioteca reutilizável |
| 7 | Shader de prisma próprio |
| 8 | Docs honestas |

Detalhamento completo das tarefas T0.1–T8.3, anti-objetivos e checklist de revisão estão na especificação de origem deste plano.
