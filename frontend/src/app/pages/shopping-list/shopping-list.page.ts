import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  sparklesOutline, alertCircleOutline, checkmarkOutline, sunnyOutline, moonOutline, informationCircleOutline,
  chevronBackOutline, chevronForwardOutline,
} from 'ionicons/icons';
import { DatePipe } from '@angular/common';
import { MonthPlanService } from '../../services/month-plan.service';
import { DietService } from '../../services/diet.service';
import { colorDieta } from '../../shared/diet-color';
import { ShoppingListService } from '../../services/shopping-list.service';
import { MonthPlan, SemanaAsignada } from '../../models/month-plan.model';
import { NOMBRES_CATEGORIA, ShoppingList, ShoppingListConfig, ShoppingListItem } from '../../models/shopping-list.model';
import { Comida, DIAS_SEMANA, DiaSemana, Diet } from '../../models/diet.model';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function mismoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Una fila del calendario: una semana natural del mes con su dieta asignada. */
interface FilaCalendario {
  semana: SemanaAsignada;
  inicio: Date;
  fin: Date;
  dias: { numero: number; fueraDeMes: boolean; esHoy: boolean }[];
  esActual: boolean;
  dieta: Diet | null;
}

const DIA_LARGO: Record<DiaSemana, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};

const DIA_CORTO: Record<DiaSemana, string> = {
  lunes: 'lun', martes: 'mar', miercoles: 'mié', jueves: 'jue', viernes: 'vie', sabado: 'sáb', domingo: 'dom',
};

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [DatePipe, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSpinner],
  templateUrl: './shopping-list.page.html',
  styleUrl: './shopping-list.page.scss',
})
export class ShoppingListPage {
  monthPlan = signal<MonthPlan | null>(null);
  dietas = signal<Diet[]>([]);
  anio = signal(new Date().getFullYear());
  mes = signal(new Date().getMonth() + 1); // 1-12
  /** fechaInicioSemana de la semana elegida (string para que sobreviva a las recargas del plan). */
  semanaSeleccionada = signal<string | null>(null);

  readonly iniciales = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  readonly colorDieta = colorDieta;

  nombreMes = computed(() => `${MESES[this.mes() - 1]} ${this.anio()}`);

  filas = computed<FilaCalendario[]>(() => {
    const hoy = new Date();
    return (this.monthPlan()?.semanas ?? []).map((semana) => {
      const inicio = new Date(semana.fechaInicioSemana);
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 6);
      const dias = this.iniciales.map((_, i) => {
        const fecha = new Date(inicio);
        fecha.setDate(inicio.getDate() + i);
        return { numero: fecha.getDate(), fueraDeMes: fecha.getMonth() + 1 !== this.mes(), esHoy: mismoDia(fecha, hoy) };
      });
      return {
        semana,
        inicio,
        fin,
        dias,
        esActual: dias.some((d) => d.esHoy),
        dieta: this.dietas().find((d) => d._id === semana.dietId) ?? null,
      };
    });
  });

  hayDietaEnElMes = computed(() => this.filas().some((f) => !!f.dieta));

  filaSeleccionada = computed(() => this.filas().find((f) => f.semana.fechaInicioSemana === this.semanaSeleccionada()) ?? null);
  lista = signal<ShoppingList | null>(null);
  generando = signal(false);
  error = signal<string | null>(null);

  itemsPorCategoria = computed(() => {
    const items = this.lista()?.items ?? [];
    const grupos = new Map<string, ShoppingListItem[]>();
    for (const item of items) {
      const lista = grupos.get(item.categoria) ?? [];
      lista.push(item);
      grupos.set(item.categoria, lista);
    }
    return Array.from(grupos.entries()).map(([categoria, items]) => ({
      categoria,
      nombreCategoria: NOMBRES_CATEGORIA[categoria as keyof typeof NOMBRES_CATEGORIA] || categoria,
      items,
    }));
  });

  config = signal<ShoppingListConfig | null>(null);

  /**
   * Comidas que no entran en la lista, con el motivo, para que no parezca que falta algo:
   * las anteriores al momento de la compra (ya consumidas) y las excluidas en Ajustes.
   */
  exclusiones = computed(() => {
    const config = this.config();
    if (!config) return null;
    const indiceCompra = DIAS_SEMANA.indexOf(config.diaCompra);
    const antesDeComprar: string[] = [];
    DIAS_SEMANA.forEach((dia, i) => {
      if (i < indiceCompra) antesDeComprar.push(DIA_LARGO[dia]);
      else if (i === indiceCompra && config.momentoCompra === 'tarde') antesDeComprar.push(`${DIA_LARGO[dia]} comida`);
    });

    const enAjustes = DIAS_SEMANA.flatMap((dia) => {
      const comidas = (['comida', 'cena'] as Comida[]).filter((c) =>
        config.exclusionesManualesExtra.some((e) => e.dia === dia && e.comida === c),
      );
      if (comidas.length === 2) return [DIA_LARGO[dia]];
      return comidas.map((c) => `${DIA_LARGO[dia]} ${c}`);
    });

    if (antesDeComprar.length === 0 && enAjustes.length === 0) return null;
    return {
      momento: `${DIA_LARGO[config.diaCompra].toLowerCase()} por la ${config.momentoCompra}`,
      antesDeComprar,
      enAjustes,
    };
  });

  comprados = computed(() => (this.lista()?.items ?? []).filter((i) => i.comprado).length);

  constructor(
    private monthPlanService: MonthPlanService,
    private shoppingListService: ShoppingListService,
    private dietService: DietService,
  ) {
    addIcons({
      sparklesOutline, alertCircleOutline, checkmarkOutline, sunnyOutline, moonOutline, informationCircleOutline,
      chevronBackOutline, chevronForwardOutline,
    });
  }

  /** Dias (abreviados) en los que el producto aparece en comidas y en cenas, para estimar cuanto comprar. */
  usos(item: ShoppingListItem): { comidas: string[]; cenas: string[] } | null {
    const apariciones = item.apariciones ?? [];
    if (apariciones.length === 0) return null;
    return {
      comidas: apariciones.filter((a) => a.comida === 'comida').map((a) => DIA_CORTO[a.dia]),
      cenas: apariciones.filter((a) => a.comida === 'cena').map((a) => DIA_CORTO[a.dia]),
    };
  }

  // Recargamos al entrar en la pestana para reflejar las semanas asignadas en "Plan".
  ionViewWillEnter() {
    this.shoppingListService.obtenerConfig().subscribe((config) => this.config.set(config));
    this.dietService.listar().subscribe((dietas) => this.dietas.set(dietas));
    this.cargarMes();
  }

  private cargarMes() {
    this.monthPlanService.obtener(this.anio(), this.mes()).subscribe((plan) => {
      this.monthPlan.set(plan);
      const seleccionada = this.semanaSeleccionada();
      const siguePudiendose = plan.semanas.some((s) => s.fechaInicioSemana === seleccionada && !!s.dietId);
      if (!siguePudiendose) {
        // Por defecto, la semana actual si tiene dieta.
        const actual = this.filas().find((f) => f.esActual && !!f.semana.dietId);
        this.semanaSeleccionada.set(actual?.semana.fechaInicioSemana ?? null);
      }
    });
  }

  cambiarMes(delta: number) {
    let m = this.mes() + delta;
    let a = this.anio();
    if (m < 1) { m = 12; a -= 1; }
    if (m > 12) { m = 1; a += 1; }
    this.anio.set(a);
    this.mes.set(m);
    this.cargarMes();
  }

  seleccionar(fila: FilaCalendario) {
    if (!fila.semana.dietId) return;
    if (fila.semana.fechaInicioSemana !== this.semanaSeleccionada()) {
      // La lista mostrada era de otra semana.
      this.lista.set(null);
      this.error.set(null);
    }
    this.semanaSeleccionada.set(fila.semana.fechaInicioSemana);
  }

  generar() {
    const plan = this.monthPlan();
    const semana = this.semanaSeleccionada();
    if (!plan?._id || !semana) return;

    this.generando.set(true);
    this.error.set(null);
    this.shoppingListService.generar(plan._id, semana).subscribe({
      next: (lista) => {
        this.generando.set(false);
        this.lista.set(lista);
      },
      error: (err) => {
        this.generando.set(false);
        this.error.set(err?.error?.error || 'No se pudo generar la lista de la compra');
      },
    });
  }

  toggleComprado(item: ShoppingListItem) {
    const lista = this.lista();
    if (!lista) return;
    this.shoppingListService.marcarComprado(lista._id, item._id, !item.comprado).subscribe((actualizada) => {
      this.lista.set(actualizada);
    });
  }
}
