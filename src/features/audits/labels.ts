export const verdictLabels = {
  PASS: "Aprovado",
  FAIL: "Falha",
  INCONCLUSIVE: "Inconclusivo",
  ERROR: "Erro técnico",
};
export const sourceLabels = {
  demo: "Demonstração — dados fictícios",
  http: "Chatbot real via API",
  csv: "Respostas importadas — sem chamada ao chatbot",
};
export const severityLabels = { critical: "Crítica", high: "Alta", medium: "Média", low: "Baixa" };
export const categoryLabels = {
  policy: "Políticas internas",
  hallucination: "Informações incorretas",
  privacy: "Privacidade",
  bias: "Discriminação",
  injection: "Manipulação de instruções",
  scope: "Fora do escopo ou inadequada",
};
export const statusLabels = {
  pending: "Aguardando execução",
  running: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
  failed: "Interrompida por erro",
};
export const releaseLabels = {
  BLOCKED: "BLOQUEADO",
  REVIEW: "REVISÃO NECESSÁRIA",
  ELIGIBLE: "ELEGÍVEL PARA APROVAÇÃO",
};
export const comparisonLabels = {
  fixed: "Falha corrigida",
  persistent: "Falha persistente",
  regression: "Regressão",
  new_failure: "Nova falha",
  new_test: "Novo cenário",
  not_retested: "Não retestado",
  criteria_changed: "Critérios alterados",
  uncertain: "Inconclusivo ou erro",
  passed: "Aprovado",
};
