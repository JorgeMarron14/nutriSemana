import { Injectable, signal } from '@angular/core';
import { Diet } from '../models/diet.model';

/** Almacen en memoria para pasar las dietas recien parseadas (sin guardar) a la pantalla de previsualizacion. */
@Injectable({ providedIn: 'root' })
export class DietDraftStore {
  readonly dietasParaRevisar = signal<Diet[]>([]);

  set(dietas: Diet[]) {
    this.dietasParaRevisar.set(dietas);
  }

  clear() {
    this.dietasParaRevisar.set([]);
  }
}
