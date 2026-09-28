export interface SemanaAsignada {
  fechaInicioSemana: string;
  dietId: string | null;
}

export interface MonthPlan {
  _id?: string;
  mes: number;
  anio: number;
  semanas: SemanaAsignada[];
}
