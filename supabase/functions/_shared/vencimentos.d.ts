export declare const JANELA_DIAS: number;

export interface FaturaVencimentoInput {
  id: string | number;
  name?: string;
  vencimento?: string | number | null;
  family?: boolean;
}

export interface VencimentoProximo {
  id: string;
  name: string;
  dia: number;
  due: string;
  dias: number;
}

export interface TextoVencimento {
  title: string;
  body: string;
  dedupe_key: string;
  data: {
    fatura_id: string;
    due: string;
    dias: number;
  };
}

export declare function parseDiaVencimento(txt: unknown): number | null;
export declare function proximoVencimento(dia: number, hojeISO: string): string;
export declare function diasEntre(deISO: string, ateISO: string): number;
export declare function vencimentosProximos(
  faturas: FaturaVencimentoInput[] | null | undefined,
  hojeISO: string,
  janela?: number
): VencimentoProximo[];
export declare function textoVencimento(v: VencimentoProximo): TextoVencimento;
