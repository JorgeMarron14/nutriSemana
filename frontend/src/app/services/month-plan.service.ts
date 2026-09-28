import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MonthPlan } from '../models/month-plan.model';

@Injectable({ providedIn: 'root' })
export class MonthPlanService {
  private base = `${environment.apiUrl}/monthplans`;

  constructor(private http: HttpClient) {}

  obtener(anio: number, mes: number): Observable<MonthPlan> {
    return this.http.get<MonthPlan>(`${this.base}/${anio}/${mes}`);
  }

  asignarSemana(anio: number, mes: number, fechaInicioSemana: string, dietId: string | null): Observable<MonthPlan> {
    return this.http.put<MonthPlan>(`${this.base}/${anio}/${mes}`, { fechaInicioSemana, dietId });
  }
}
