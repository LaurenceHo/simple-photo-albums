export default class ResponseError extends Error {
  code: number;
  status: string;
  message: string;

  constructor(code: number, status: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.message = message;
  }
}
