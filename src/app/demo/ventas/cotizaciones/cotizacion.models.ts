export interface CotizacionApiDto {
  id?: number | string | null;
  PPV05_IdNDP?: number | string | null;
  numero?: string | null;
  PPV05_NumNDP?: string | null;
  serie?: string | null;
  PPV05_SerieNDP?: string | null;
  tipNDP?: string | null;
  PPV05_TipNDP?: string | null;
  fecha?: string | null;
  PPV05_FecDocu?: string | null;
  cliente?: string | null;
  PPV05_NomCliente?: string | null;
  vendedor?: string | null;
  PPV05_Vendedor?: string | null;
  operador?: string | null;
  PPV05_Operador?: string | null;
  total?: number | string | null;
  PPV05_TotalDocu?: number | string | null;
  estado?: string | null;
  PPV05_EstDocu?: string | null;
  moneda?: string | null;
  PPV05_Moneda?: string | null;
}

export interface CotizacionUI {
  id: string;
  tipNDP: string;
  serie: string;
  numero: string;
  numeroCompleto: string;
  fecha: string;
  cliente: string;
  vendedor: string;
  total: number;
  estado: string;
  moneda: string;
}
