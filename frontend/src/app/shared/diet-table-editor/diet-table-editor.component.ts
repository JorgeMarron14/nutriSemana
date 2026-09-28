import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  trashOutline,
  sunnyOutline,
  moonOutline,
  checkmarkCircle,
  ellipseOutline,
  informationCircleOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { Comida, DIAS_SEMANA, DiaSemana, Diet, Dish } from '../../models/diet.model';

const NOMBRE_DIA: Record<DiaSemana, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

@Component({
  selector: 'app-diet-table-editor',
  standalone: true,
  imports: [FormsModule, DatePipe, IonIcon],
  templateUrl: './diet-table-editor.component.html',
  styleUrl: './diet-table-editor.component.scss',
})
export class DietTableEditorComponent {
  @Input({ required: true }) diet!: Diet;

  readonly dias = DIAS_SEMANA;
  readonly comidas: Comida[] = ['comida', 'cena'];
  readonly nombreDia = NOMBRE_DIA;

  /** Platos que habia antes de marcar una comida como libre, para restaurarlos si se desmarca. */
  private platosAntesDeLibre = new Map<string, Dish[]>();

  constructor() {
    addIcons({
      addOutline,
      trashOutline,
      sunnyOutline,
      moonOutline,
      checkmarkCircle,
      ellipseOutline,
      informationCircleOutline,
      documentTextOutline,
    });
  }

  platos(dia: DiaSemana, comida: Comida): Dish[] {
    return this.diet.semana[dia][comida];
  }

  esLibre(dia: DiaSemana, comida: Comida): boolean {
    return this.platos(dia, comida).some((plato) => plato.libre);
  }

  toggleLibre(dia: DiaSemana, comida: Comida) {
    const clave = `${dia}-${comida}`;
    if (this.esLibre(dia, comida)) {
      this.diet.semana[dia][comida] = this.platosAntesDeLibre.get(clave) ?? [];
      this.platosAntesDeLibre.delete(clave);
    } else {
      this.platosAntesDeLibre.set(clave, this.platos(dia, comida));
      this.diet.semana[dia][comida] = [{ descripcion: 'LIBRE', cantidad: null, libre: true }];
    }
  }

  agregarPlato(dia: DiaSemana, comida: Comida) {
    this.platos(dia, comida).push({ descripcion: '', cantidad: null, libre: false });
  }

  eliminarPlato(dia: DiaSemana, comida: Comida, index: number) {
    this.platos(dia, comida).splice(index, 1);
  }
}
