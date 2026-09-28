import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonButtons, IonBackButton,
  IonFooter, IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trashOutline, checkmarkOutline, documentTextOutline, alertCircleOutline } from 'ionicons/icons';
import { DietDraftStore } from '../../../services/diet-draft.store';
import { DietService } from '../../../services/diet.service';
import { DietTableEditorComponent } from '../../../shared/diet-table-editor/diet-table-editor.component';

@Component({
  selector: 'app-diet-preview',
  standalone: true,
  imports: [
    RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonButtons, IonBackButton,
    IonFooter, IonSpinner, DietTableEditorComponent,
  ],
  templateUrl: './diet-preview.page.html',
  styleUrl: './diet-preview.page.scss',
})
export class DietPreviewPage {
  private draftStore = inject(DietDraftStore);

  dietas = this.draftStore.dietasParaRevisar;
  seleccionada = signal(0);
  dietaSeleccionada = computed(() => this.dietas()[this.seleccionada()] ?? null);
  guardando = signal(false);
  error = signal<string | null>(null);

  constructor(private dietService: DietService, private router: Router) {
    addIcons({ trashOutline, checkmarkOutline, documentTextOutline, alertCircleOutline });
  }

  descartar(index: number) {
    this.dietas.update((lista) => lista.filter((_, i) => i !== index));
    this.seleccionada.set(Math.max(0, Math.min(this.seleccionada(), this.dietas().length - 1)));
  }

  guardarTodas() {
    if (this.dietas().length === 0) return;
    this.guardando.set(true);
    this.error.set(null);
    this.dietService.guardar(this.dietas()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.draftStore.clear();
        this.router.navigateByUrl('/tabs/diets');
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.error || 'No se pudieron guardar las dietas');
      },
    });
  }
}
