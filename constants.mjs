export const scriptReg =
  /<script\b[^>]*type=['"]([^'"]*?)['"][^>]*src=['"]([^'"]*?)['"][^>]*>/gi;

export const htmlTypesReg = /\.(html)$/;
export const JsTypeReg = /\.(?:j|t)sx?$|\.mjs$/;
export const bareImportReg = /^(?![a-zA-Z]:)(?!\/)[\w@](?!.*:\/\/)/;
