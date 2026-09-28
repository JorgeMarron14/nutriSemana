import { Comida, DiaSemana } from './diet.model';

export type Categoria = 'verdura_fruta' | 'carne_pescado' | 'legumbre_cereal' | 'lacteos' | 'otros';

export const NOMBRES_CATEGORIA: Record<Categoria, string> = {
  verdura_fruta: 'Verdura y fruta',
  carne_pescado: 'Carne y pescado',
  legumbre_cereal: 'Legumbre y cereal',
  lacteos: 'Lácteos',
  otros: 'Otros',
};

export interface Aparicion {
  dia: DiaSemana;
  comida: Comida;
}

export interface ShoppingListItem {
  _id: string;
  nombre: string;
  categoria: Categoria;
  cantidad: string | null;
  comprado: boolean;
  /** Comidas y cenas de la semana en las que aparece (listas antiguas no lo tienen). */
  apariciones?: Aparicion[];
}

export interface ShoppingList {
  _id: string;
  monthPlanId: string;
  fechaInicioSemana: string;
  dietId: string;
  items: ShoppingListItem[];
}

export interface Exclusion {
  dia: DiaSemana;
  comida: Comida;
}

/** Cantidad que se suele tomar de un tipo de alimento por comida (la IA la usa para la lista de la compra). */
export interface Racion {
  alimento: string;
  cantidad: string;
}

export interface ShoppingListConfig {
  _id?: string;
  diaCompra: DiaSemana;
  momentoCompra: 'mañana' | 'tarde';
  exclusionesManualesExtra: Exclusion[];
  raciones: Racion[];
}
