export function errorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.toLowerCase() === "network error"
  ) {
    return "Conexão interrompida. O pedido pode estar pendente; tente novamente para recuperar a mesma tentativa.";
  }
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
    if (!response) {
      return "Conexão interrompida. O pedido pode estar pendente; tente novamente para recuperar a mesma tentativa.";
    }
  }
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}
