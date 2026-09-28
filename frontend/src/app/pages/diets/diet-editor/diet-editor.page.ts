import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonButtons, IonBackButton,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { saveOutline } from 'ionicons/icons';
import { DietService } from '../../../services/diet.service';
import { Diet } from '../../../models/diet.model';
import { DietTableEditorComponent } from '../../../shared/diet-table-editor/diet-table-editor.component';

@Component({
  selector: 'app-diet-editor',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonButtons, IonBackButton, DietTableEditorComponent],
  templateUrl: './diet-editor.page.html',
})
export class DietEditorPage implements OnInit {
  diet = signal<Diet | null>(null);
  guardando = signal(false);
  error = signal<string | null>(null);

  constructor(private route: ActivatedRoute, private dietService: DietService, private router: Router) {
    addIcons({ saveOutline });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.dietService.obtener(id).subscribe((diet) => this.diet.set(diet));
  }

  guardar() {
    const diet = this.diet();
    if (!diet?._id) return;
    this.guardando.set(true);
    this.error.set(null);
    this.dietService.actualizar(diet._id, diet).subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigateByUrl('/tabs/diets');
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.error || 'No se pudo guardar la dieta');
      },
    });
  }
}
