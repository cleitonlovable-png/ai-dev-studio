export interface ActiveAiSession {
  /** id da sessao PTY (terminal), usado para anexar o xterm. */
  sessionId: string;
  /** rotulo exibido no cabecalho da aba Terminal. */
  label: string;
  /** id do registro AiSession no banco, ou null se nao foi possivel criar. */
  dbSessionId: number | null;
  provider: string;
}
