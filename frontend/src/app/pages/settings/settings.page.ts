import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cartOutline, scaleOutline, banOutline, addOutline, trashOutline, checkmarkOutline, closeOutline,
  checkmarkCircle, saveOutline, logOutOutline, sunnyOutline, moonOutline, timeOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { ShoppingListService } from '../../services/shopping-list.service';
import { DIAS_SEMANA, DiaSemana, Comida } from '../../models/diet.model';
import { Exclusion, ShoppingListConfig } from '../../models/shopping-list.model';

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
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  readonly dias = DIAS_SEMANA;
  readonly comidas: Comida[] = ['comida', 'cena'];
  readonly nombreDia = NOMBRE_DIA;
  readonly momentos: { valor: ShoppingListConfig['momentoCompra']; texto: string; icono: string }[] = [
    { valor: 'mañana', texto: 'Mañana', icono: 'sunny-outline' },
    { valor: 'tarde', texto: 'Tarde', icono: 'moon-outline' },
  ];

  config = signal<ShoppingListConfig | null>(null);
  guardando = signal(false);
  guardado = signal(false);

  constructor(private shoppingListService: ShoppingListService, private auth: AuthService, private router: Router) {
    addIcons({
      cartOutline, scaleOutline, banOutline, addOutline, trashOutline, checkmarkOutline, closeOutline,
      checkmarkCircle, saveOutline, logOutOutline, sunnyOutline, moonOutline, timeOutline,
    });
  }

  ionViewWillEnter() {
    this.guardado.set(false);
    this.shoppingListService.obtenerConfig().subscribe((config) => this.config.set({ ...config, raciones: config.raciones ?? [] }));
  }

  /**
   * Comidas que ya se habran hecho cuando se compra (dias anteriores al de la compra, y la comida
   * de ese dia si se compra por la tarde). El backend las excluye siempre; aqui solo se muestran.
   */
  esAutoExcluido(dia: DiaSemana, comida: Comida): boolean {
    const config = this.config();
    if (!config) return false;
    const indiceDia = DIAS_SEMANA.indexOf(dia);
    const indiceCompra = DIAS_SEMANA.indexOf(config.diaCompra);
    return indiceDia < indiceCompra || (indiceDia === indiceCompra && comida === 'comida' && config.momentoCompra === 'tarde');
  }

  estaExcluido(dia: DiaSemana, comida: Comida): boolean {
    return !!this.config()?.exclusionesManualesExtra.some((e) => e.dia === dia && e.comida === comida);
  }

  toggleExclusion(dia: DiaSemana, comida: Comida) {
    const config = this.config();
    if (!config) return;
    const existe = this.estaExcluido(dia, comida);
    const exclusiones: Exclusion[] = existe
      ? config.exclusionesManualesExtra.filter((e) => !(e.dia === dia && e.comida === comida))
      : [...config.exclusionesManualesExtra, { dia, comida }];
    this.config.set({ ...config, exclusionesManualesExtra: exclusiones });
  }

  agregarRacion() {
    this.config()?.raciones.push({ alimento: '', cantidad: '' });
  }

  eliminarRacion(index: number) {
    this.config()?.raciones.splice(index, 1);
  }

  guardar() {
    const config = this.config();
    if (!config) return;
    this.guardado.set(false);
    this.guardando.set(true);
    this.shoppingListService.actualizarConfig(config).subscribe({
      next: (actualizado) => {
        this.config.set({ ...actualizado, raciones: actualizado.raciones ?? [] });
        this.guardando.set(false);
        this.guardado.set(true);
      },
      error: () => this.guardando.set(false),
    });
  }

  cerrarSesion() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
