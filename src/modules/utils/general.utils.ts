export function toLowerCase(str: string) {
  return str.toLowerCase();
}

export function toLowerCaseArr(strs: string[]): string[] {
  return strs.map((s) => s.toLowerCase());
}

export function objectToLowerCaseArr(obj: {}): string[] {
  return toLowerCaseArr(Object.keys(obj));
}
