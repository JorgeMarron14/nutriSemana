import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatDetalle {
  dia: string;
  comida?: string;
  mensaje: string;
}

export interface MensajeHistorial {
  autor: 'usuario' | 'app';
  texto: string;
}

export interface ChatResponse {
  respuesta: string;
  detalles: ChatDetalle[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private base = `${environment.apiUrl}/chat`;

  constructor(private http: HttpClient) {}

  /** `historial`: mensajes previos de la conversacion, para que entienda preguntas de seguimiento. */
  preguntar(pregunta: string, historial: MensajeHistorial[] = []): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.base, { pregunta, historial });
  }
}
