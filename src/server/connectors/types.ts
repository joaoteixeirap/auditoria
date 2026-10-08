export type ConnectorInput = {
  message: string;
  sessionId?: string;
  context?: Readonly<Record<string, string>>;
};
export type ConnectorResponse = {
  text: string;
  sessionId?: string;
  latencyMs: number;
  error?: string;
};
export interface ChatbotConnector {
  send(input: ConnectorInput): Promise<ConnectorResponse>;
}
