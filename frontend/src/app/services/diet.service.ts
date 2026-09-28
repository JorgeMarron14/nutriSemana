import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Diet } from '../models/diet.model';

@Injectable({ providedIn: 'root' })
export class DietService {
  private base = `${environment.apiUrl}/diets`;

  constructor(private http: HttpClient) {}

  parsePdfs(files: File[]): Observable<{ dietas: Diet[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return this.http.post<{ dietas: Diet[] }>(`${this.base}/parse`, formData);
  }

  guardar(dietas: Diet[]): Observable<Diet[]> {
    return this.http.post<Diet[]>(this.base, { dietas });
  }

  listar(): Observable<Diet[]> {
    return this.http.get<Diet[]>(this.base);
  }

  obtener(id: string): Observable<Diet> {
    return this.http.get<Diet>(`${this.base}/${id}`);
  }

  actualizar(id: string, diet: Partial<Diet>): Observable<Diet> {
    return this.http.put<Diet>(`${this.base}/${id}`, diet);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
