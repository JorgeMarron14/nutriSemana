import { Component, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonFooter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowUp, leaf, refreshOutline } from 'ionicons/icons';
import { ChatService, MensajeHistorial } from '../../services/chat.service';
import { formatearRespuesta } from '../../shared/chat-format';

interface Mensaje extends MensajeHistorial {
  /** HTML ya formateado (solo en respuestas del asistente). */
  html?: string;
  error?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonFooter],
  templateUrl: './chat.page.html',
  styleUrl: './chat.page.scss',
})
export class ChatPage {
  @ViewChild(IonContent) contenido?: IonContent;

  pregunta = '';
  mensajes = signal<Mensaje[]>([]);
  cargando = signal(false);

  readonly sugerencias = [
    '¿Qué ceno hoy?',
    '¿Qué ingredientes necesito para la cena de hoy?',
    '¿Cómo preparo la comida de mañana?',
    '¿Qué toca el fin de semana?',
  ];

  constructor(private chatService: ChatService) {
    addIcons({ arrowUp, leaf, refreshOutline });
  }

  enviar(texto = this.pregunta) {
    const pregunta = texto.trim();
    if (!pregunta || this.cargando()) return;

    // El historial va sin los errores y sin la pregunta actual.
    const historial: MensajeHistorial[] = this.mensajes()
      .filter((m) => !m.error)
      .map(({ autor, texto }) => ({ autor, texto }));

    this.mensajes.update((m) => [...m, { autor: 'usuario', texto: pregunta }]);
    this.pregunta = '';
    this.cargando.set(true);
    this.bajar();

    this.chatService.preguntar(pregunta, historial).subscribe({
      next: (res) => {
        this.cargando.set(false);
        this.mensajes.update((m) => [...m, { autor: 'app', texto: res.respuesta, html: formatearRespuesta(res.respuesta) }]);
        this.bajar();
      },
      error: (err) => {
        this.cargando.set(false);
        const texto = err?.error?.error || 'No he podido responder. Inténtalo de nuevo.';
        this.mensajes.update((m) => [...m, { autor: 'app', texto, html: formatearRespuesta(texto), error: true }]);
        this.bajar();
      },
    });
  }

  nuevaConversacion() {
    this.mensajes.set([]);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviar();
    }
  }

  private bajar() {
    setTimeout(() => this.contenido?.scrollToBottom(250));
  }
}
