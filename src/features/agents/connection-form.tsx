"use client";
import { useState } from "react";
import { configureHttp, testHttpConnection } from "./actions";
import { defaultHttpConfig, httpConfigSchema, type HttpConfig } from "./http-contract";
import type { ActionResult } from "@/server/services/errors";
import { Button } from "@/components/ui/button";
import { Field, Feedback, inputClass, useServerSubmit } from "@/components/shared/forms";

export function ConnectionForm({
  agentId,
  versions,
}: {
  agentId: string;
  versions: { id: string; label: string }[];
}) {
  const [versionId, setVersion] = useState(versions[0]?.id ?? "");
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [generic, setGeneric] = useState(true),
    [method, setMethod] = useState<HttpConfig["method"]>("POST");
  const [headers, setHeaders] = useState("{}"),
    [query, setQuery] = useState("{}"),
    [secrets, setSecrets] = useState("{}");
  const [body, setBody] = useState(defaultHttpConfig.body),
    [path, setPath] = useState("text"),
    [sessionPath, setSessionPath] = useState("");
  const [question, setQuestion] = useState("Olá! Qual é a finalidade deste atendimento?");
  const [localError, setLocalError] = useState("");
  const [testing, setTesting] = useState(false),
    [testResult, setTestResult] = useState<ActionResult | null>(null);
  const configuration = () => {
    try {
      setLocalError("");
      return {
        versionId,
        endpoint,
        token,
        authorized,
        ...(generic
          ? {
              config: httpConfigSchema.parse({
                method,
                headers: JSON.parse(headers) as unknown,
                query: JSON.parse(query) as unknown,
                body,
                responsePath: path,
                sessionPath,
                secrets: JSON.parse(secrets) as unknown,
              }),
            }
          : {}),
      };
    } catch {
      setLocalError(
        "Confira o JSON, as variáveis e os caminhos. GET requer corpo vazio e {{message}} nos parâmetros.",
      );
      return null;
    }
  };
  const { submit, pending, result } = useServerSubmit(
    async (input: {
      versionId: string;
      endpoint: string;
      token: string;
      authorized: boolean;
      config?: HttpConfig;
    }) => {
      const response = await configureHttp(agentId, input);
      if (response.success) {
        setToken("");
        setVersion("");
        setAuthorized(false);
        setSecrets("{}");
        setHeaders("{}");
        setQuery("{}");
        setBody(defaultHttpConfig.body);
        setTestResult(null);
      }
      return response;
    },
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const value = configuration();
        if (value) submit(value);
      }}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        Configure o formato exigido pela API do seu chatbot. Cada versão preserva sua conexão. Para
        alterar o destino ou uma credencial, registre uma nova versão.
      </p>
      <fieldset disabled={pending || testing} className="space-y-4">
        <Field id="http-version" label="Versão da conexão">
          <select
            id="http-version"
            className={inputClass}
            value={versionId}
            onChange={(event) => setVersion(event.target.value)}
          >
            <option value="">Selecione uma versão sem conexão</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.label}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={generic}
            onChange={(event) => setGeneric(event.target.checked)}
          />
          Personalizar o formato da API
        </label>
        {generic && (
          <div className="space-y-4 rounded-lg border p-4">
            <Field id="http-method" label="Método HTTP">
              <select
                id="http-method"
                className={inputClass}
                value={method}
                onChange={(event) => setMethod(event.target.value as HttpConfig["method"])}
              >
                {["GET", "POST", "PUT", "PATCH"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <p className="text-xs leading-5">
              Use {"{{message}}"} para a pergunta, {"{{sessionId}}"} para a sessão de cada cenário e{" "}
              {"{{secret.nome}}"} para uma credencial. O corpo deve ser JSON. Não use URL com
              credenciais ou parâmetros; informe parâmetros abaixo.
            </p>
            <Field id="http-headers" label="Headers em JSON">
              <textarea
                id="http-headers"
                className={inputClass}
                rows={3}
                maxLength={16000}
                value={headers}
                onChange={(event) => setHeaders(event.target.value)}
                placeholder={'{"X-API-Key":"{{secret.chave}}"}'}
              />
            </Field>
            <Field id="http-query" label="Parâmetros da URL em JSON">
              <textarea
                id="http-query"
                className={inputClass}
                rows={2}
                maxLength={16000}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={'{"pergunta":"{{message}}"}'}
              />
            </Field>
            <Field id="http-body" label="Corpo da requisição em JSON">
              <textarea
                id="http-body"
                className={inputClass}
                rows={5}
                maxLength={16000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </Field>
            <Field id="http-path" label="Caminho do texto na resposta">
              <input
                id="http-path"
                className={inputClass}
                maxLength={200}
                value={path}
                onChange={(event) => setPath(event.target.value)}
                placeholder="data.resposta"
              />
            </Field>
            <Field id="http-session" label="Caminho da sessão retornada (opcional)">
              <input
                id="http-session"
                className={inputClass}
                maxLength={200}
                value={sessionPath}
                onChange={(event) => setSessionPath(event.target.value)}
                placeholder="data.sessionId"
              />
            </Field>
            <Field id="http-secrets" label="Credenciais nomeadas em JSON (opcional)">
              <textarea
                id="http-secrets"
                className={inputClass}
                autoComplete="off"
                spellCheck={false}
                rows={2}
                maxLength={16000}
                value={secrets}
                onChange={(event) => setSecrets(event.target.value)}
                placeholder={'{"chave":"valor informado pela empresa"}'}
              />
            </Field>
            <p className="text-xs">
              Headers, corpo, parâmetros e credenciais são criptografados no servidor e não aparecem
              nos relatórios. Não compartilhe capturas deste formulário contendo credenciais.
            </p>
          </div>
        )}
        {!generic && (
          <p className="text-xs">
            Formato original: POST com message/sessionId, resposta com text. Conexões já cadastradas
            continuam funcionando.
          </p>
        )}
        <Field id="http-endpoint" label="URL HTTPS do chatbot">
          <input
            id="http-endpoint"
            type="url"
            required
            maxLength={2000}
            className={inputClass}
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
          />
        </Field>
        <Field id="http-token" label="Token Bearer (opcional)">
          <input
            id="http-token"
            type="password"
            autoComplete="new-password"
            maxLength={4000}
            className={inputClass}
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </Field>
        <label className="flex items-start gap-2 text-sm leading-6">
          <input
            className="mt-1"
            type="checkbox"
            checked={authorized}
            onChange={(event) => setAuthorized(event.target.checked)}
          />
          Autorizo conectar este endpoint e enviar a pergunta de teste. Tenho permissão para testar
          este chatbot.
        </label>
      </fieldset>
      <Field id="http-question" label="Pergunta para testar a conexão">
        <input
          id="http-question"
          className={inputClass}
          maxLength={2000}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={pending || testing}
        />
      </Field>
      <Button
        variant="outline"
        type="button"
        disabled={pending || testing || !authorized || !versionId || !endpoint || !question.trim()}
        onClick={async () => {
          const value = configuration();
          if (!value) return;
          setTesting(true);
          setTestResult(null);
          try {
            setTestResult(await testHttpConnection(agentId, value, question));
          } catch {
            setTestResult({
              success: false,
              message: "Não foi possível testar a conexão. Tente novamente.",
            });
          } finally {
            setTesting(false);
          }
        }}
      >
        {testing ? "Testando…" : "Testar conexão"}
      </Button>
      {localError && (
        <p role="alert" className="text-sm text-red-700">
          {localError}
        </p>
      )}
      <Feedback result={testResult} />
      <Feedback result={result} />
      <Button disabled={pending || testing || !versionId || !authorized} type="submit">
        {pending ? "Salvando…" : "Registrar conexão HTTP"}
      </Button>
    </form>
  );
}
