export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export const DIAS_SEMANA: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export type Comida = 'comida' | 'cena';

export interface Dish {
  descripcion: string;
  cantidad: string | null;
  libre: boolean;
}

export interface DayPlan {
  comida: Dish[];
  cena: Dish[];
}

export type Semana = Record<DiaSemana, DayPlan>;

export interface Diet {
  _id?: string;
  nombre: string;
  fechaOrigenPdf: string | null;
  reglasGenerales: string | null;
  semana: Semana;
  origenPdf?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function crearSemanaVacia(): Semana {
  return DIAS_SEMANA.reduce((acc, dia) => {
    acc[dia] = { comida: [], cena: [] };
    return acc;
  }, {} as Semana);
}
