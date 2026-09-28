import { Component, signal, ViewChild, ElementRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, trashOutline, createOutline, restaurantOutline, alertCircleOutline } from 'ionicons/icons';
import { DietService } from '../../services/diet.service';
import { DietDraftStore } from '../../services/diet-draft.store';
import { Diet } from '../../models/diet.model';

@Component({
  selector: 'app-diets',
  standalone: true,
  imports: [DatePipe, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSpinner],
  templateUrl: './diets.page.html',
  styleUrl: './diets.page.scss',
})
export class DietsPage {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  dietas = signal<Diet[]>([]);
  subiendo = signal(false);
  error = signal<string | null>(null);

  constructor(private dietService: DietService, private draftStore: DietDraftStore, private router: Router) {
    addIcons({ cloudUploadOutline, trashOutline, createOutline, restaurantOutline, alertCircleOutline });
  }

  // Las pestanas de Ionic se quedan en cache: recargamos cada vez que se entra (p. ej. al volver de guardar un PDF).
  ionViewWillEnter() {
    this.cargar();
  }

  cargar() {
    this.dietService.listar().subscribe((dietas) => this.dietas.set(dietas));
  }

  abrirSelectorArchivos() {
    this.fileInput.nativeElement.click();
  }

  onArchivosSeleccionados(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) return;

    this.error.set(null);
    this.subiendo.set(true);
    this.dietService.parsePdfs(files).subscribe({
      next: ({ dietas }) => {
        this.subiendo.set(false);
        this.draftStore.set(dietas);
        this.router.navigateByUrl('/tabs/diets/preview');
      },
      error: (err) => {
        this.subiendo.set(false);
        this.error.set(err?.error?.error || 'No se pudo parsear el PDF');
      },
    });
    input.value = '';
  }

  editar(diet: Diet) {
    this.router.navigateByUrl(`/tabs/diets/${diet._id}/edit`);
  }

  eliminar(diet: Diet) {
    if (!diet._id) return;
    this.dietService.eliminar(diet._id).subscribe(() => this.cargar());
  }
}
