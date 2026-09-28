import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ShoppingList, ShoppingListConfig } from '../models/shopping-list.model';

@Injectable({ providedIn: 'root' })
export class ShoppingListService {
  private base = `${environment.apiUrl}/shopping-list`;
  private settingsBase = `${environment.apiUrl}/settings/shopping-list`;

  constructor(private http: HttpClient) {}

  generar(monthPlanId: string, fechaInicioSemana: string): Observable<ShoppingList> {
    return this.http.post<ShoppingList>(`${this.base}/generate`, { monthPlanId, fechaInicioSemana });
  }

  obtener(id: string): Observable<ShoppingList> {
    return this.http.get<ShoppingList>(`${this.base}/${id}`);
  }

  marcarComprado(listId: string, itemId: string, comprado: boolean): Observable<ShoppingList> {
    return this.http.patch<ShoppingList>(`${this.base}/${listId}/items/${itemId}`, { comprado });
  }

  obtenerConfig(): Observable<ShoppingListConfig> {
    return this.http.get<ShoppingListConfig>(this.settingsBase);
  }

  actualizarConfig(config: Partial<ShoppingListConfig>): Observable<ShoppingListConfig> {
    return this.http.put<ShoppingListConfig>(this.settingsBase, config);
  }
}
