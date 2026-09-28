import { Component, computed, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonModal, IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline, chevronForwardOutline, addOutline, checkmarkCircle, swapHorizontalOutline,
  closeCircleOutline, sunnyOutline, moonOutline, documentTextOutline, todayOutline, chevronDownOutline,
} from 'ionicons/icons';
import { MonthPlanService } from '../../services/month-plan.service';
import { DietService } from '../../services/diet.service';
import { MonthPlan, SemanaAsignada } from '../../models/month-plan.model';
import { Comida, DIAS_SEMANA, Diet, Dish } from '../../models/diet.model';
import { colorDieta } from '../../shared/diet-color';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const INICIAL_DIA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface DiaSemanaVista {
  fecha: Date;
  inicial: string;
  numero: number;
  fueraDeMes: boolean;
  esHoy: boolean;
}

interface SemanaVista {
  semana: SemanaAsignada;
  /** Posicion de la semana dentro del mes (1..n), independiente del orden en pantalla. */
  numero: number;
  inicio: Date;
  fin: Date;
  dias: DiaSemanaVista[];
  esActual: boolean;
  dieta: Diet | null;
}

function mismoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [DatePipe, NgTemplateOutlet, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonModal, IonSpinner],
  templateUrl: './planner.page.html',
  styleUrl: './planner.page.scss',
})
export class PlannerPage {
  anio = signal(new Date().getFullYear());
  mes = signal(new Date().getMonth() + 1); // 1-12
  monthPlan = signal<MonthPlan | null>(null);
  dietas = signal<Diet[]>([]);
  hoy = signal(new Date());

  /** Dia que se consulta en la tarjeta de menu (por defecto hoy). */
  fechaSeleccionada = signal(this.inicioDelDia(new Date()));

  /** Semana para la que esta abierto el selector de dieta. */
  semanaEditando = signal<SemanaVista | null>(null);
  guardando = signal(false);

  readonly iniciales = INICIAL_DIA;

  nombreMes = computed(() => `${MESES[this.mes() - 1]} ${this.anio()}`);
  esMesActual = computed(() => this.anio() === this.hoy().getFullYear() && this.mes() === this.hoy().getMonth() + 1);

  /** Semanas del mes en orden cronologico. */
  private semanasCronologicas = computed<SemanaVista[]>(() => {
    const hoy = this.hoy();
    return (this.monthPlan()?.semanas ?? []).map((semana, i) => {
      const inicio = new Date(semana.fechaInicioSemana);
      const dias = INICIAL_DIA.map((inicial, i) => {
        const fecha = new Date(inicio);
        fecha.setDate(inicio.getDate() + i);
        return {
          fecha,
          inicial,
          numero: fecha.getDate(),
          fueraDeMes: fecha.getMonth() + 1 !== this.mes(),
          esHoy: mismoDia(fecha, hoy),
        };
      });
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 6);
      return {
        semana,
        numero: i + 1,
        inicio,
        fin,
        dias,
        esActual: dias.some((d) => d.esHoy),
        dieta: this.dietaPorId(semana.dietId),
      };
    });
  });

  /** La semana actual va la primera (justo debajo de la tarjeta del menu); el resto en orden cronologico. */
  semanas = computed<SemanaVista[]>(() => {
    const vistas = this.semanasCronologicas();
    return [...vistas.filter((v) => v.esActual), ...vistas.filter((v) => !v.esActual)];
  });

  /**
   * Solo en el mes actual se separan las semanas ya terminadas (plegadas al final); en meses
   * pasados o futuros se muestran todas, porque se ha navegado a ellos a proposito.
   */
  private esPasada = (v: SemanaVista) => this.esMesActual() && v.fin < this.inicioDelDia(this.hoy());
  semanasVisibles = computed(() => this.semanas().filter((v) => !this.esPasada(v)));
  semanasPasadas = computed(() => this.semanasCronologicas().filter((v) => this.esPasada(v)));
  mostrarPasadas = signal(false);

  semanasPlanificadas = computed(() => this.semanas().filter((s) => !!s.dieta).length);

  /** Menu del dia seleccionado: su semana, la dieta asignada (si hay) y sus platos. */
  menuDia = computed(() => {
    const fecha = this.fechaSeleccionada();
    const vista = this.semanaDe(fecha);
    if (!vista) return null;
    const indice = (fecha.getDay() + 6) % 7; // 0 = lunes
    const plan = vista.dieta?.semana[DIAS_SEMANA[indice]];
    return {
      fecha,
      vista,
      indice,
      esHoy: mismoDia(fecha, this.hoy()),
      dieta: vista.dieta,
      comida: plan?.comida ?? [],
      cena: plan?.cena ?? [],
    };
  });

  puedeRetroceder = computed(() => !!this.semanaDe(this.desplazar(this.fechaSeleccionada(), -1)));
  puedeAvanzar = computed(() => !!this.semanaDe(this.desplazar(this.fechaSeleccionada(), 1)));

  /** "Hoy", "Mañana", "Ayer" o null para el resto de dias. */
  etiquetaRelativa = computed(() => {
    const dias = Math.round((this.fechaSeleccionada().getTime() - this.inicioDelDia(this.hoy()).getTime()) / 86400000);
    return ({ 0: 'Hoy', 1: 'Mañana', [-1]: 'Ayer' } as Record<number, string>)[dias] ?? null;
  });

  constructor(private monthPlanService: MonthPlanService, private dietService: DietService) {
    addIcons({
      chevronBackOutline, chevronForwardOutline, addOutline, checkmarkCircle, swapHorizontalOutline,
      closeCircleOutline, sunnyOutline, moonOutline, documentTextOutline, todayOutline, chevronDownOutline,
    });
  }

  // Recargamos al entrar en la pestana para ver las dietas recien subidas.
  ionViewWillEnter() {
    this.hoy.set(new Date());
    if (this.esMesActual()) this.fechaSeleccionada.set(this.inicioDelDia(new Date()));
    this.dietService.listar().subscribe((dietas) => this.dietas.set(dietas));
    this.cargarMes();
  }

  cargarMes() {
    this.monthPlanService.obtener(this.anio(), this.mes()).subscribe((plan) => this.monthPlan.set(plan));
  }

  mesAnterior() {
    let m = this.mes() - 1;
    let a = this.anio();
    if (m < 1) { m = 12; a -= 1; }
    this.irA(a, m);
  }

  mesSiguiente() {
    let m = this.mes() + 1;
    let a = this.anio();
    if (m > 12) { m = 1; a += 1; }
    this.irA(a, m);
  }

  irAHoy() {
    this.irA(this.hoy().getFullYear(), this.hoy().getMonth() + 1);
  }

  private irA(anio: number, mes: number) {
    this.anio.set(anio);
    this.mes.set(mes);
    // En el mes actual se consulta hoy; en otro mes, su dia 1.
    this.fechaSeleccionada.set(this.esMesActual() ? this.inicioDelDia(this.hoy()) : new Date(anio, mes - 1, 1));
    this.monthPlan.set(null);
    this.mostrarPasadas.set(false);
    this.cargarMes();
  }

  moverDia(delta: number) {
    const destino = this.desplazar(this.fechaSeleccionada(), delta);
    if (this.semanaDe(destino)) this.fechaSeleccionada.set(destino);
  }

  seleccionarDia(fecha: Date) {
    this.fechaSeleccionada.set(this.inicioDelDia(fecha));
  }

  volverAHoy() {
    if (this.esMesActual()) this.seleccionarDia(this.hoy());
    else this.irAHoy();
  }

  private semanaDe(fecha: Date): SemanaVista | null {
    return this.semanasCronologicas().find((v) => v.dias.some((d) => mismoDia(d.fecha, fecha))) ?? null;
  }

  private desplazar(fecha: Date, dias: number): Date {
    const resultado = new Date(fecha);
    resultado.setDate(fecha.getDate() + dias);
    return resultado;
  }

  private inicioDelDia(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  }

  esDiaSeleccionado(fecha: Date): boolean {
    return mismoDia(fecha, this.fechaSeleccionada());
  }

  dietaPorId(dietId: string | null): Diet | null {
    if (!dietId) return null;
    return this.dietas().find((d) => d._id === dietId) ?? null;
  }

  readonly colorDieta = colorDieta;

  abrirSelector(semana: SemanaVista) {
    this.semanaEditando.set(semana);
  }

  cerrarSelector() {
    this.semanaEditando.set(null);
  }

  asignar(dietId: string | null) {
    const vista = this.semanaEditando();
    if (!vista) return;
    this.guardando.set(true);
    this.monthPlanService
      .asignarSemana(this.anio(), this.mes(), vista.semana.fechaInicioSemana, dietId)
      .subscribe({
        next: (plan) => {
          this.monthPlan.set(plan);
          this.guardando.set(false);
          this.cerrarSelector();
        },
        error: () => this.guardando.set(false),
      });
  }

  textoPlatos(platos: Dish[]): string {
    if (platos.length === 0) return 'Nada apuntado';
    if (platos.some((p) => p.libre)) return 'Libre';
    return platos.map((p) => (p.cantidad ? `${p.descripcion} (${p.cantidad})` : p.descripcion)).join(' + ');
  }

  comidasLibres(dieta: Diet): number {
    return DIAS_SEMANA.reduce(
      (total, dia) => total + (['comida', 'cena'] as Comida[]).filter((c) => dieta.semana[dia][c].some((p) => p.libre)).length,
      0,
    );
  }
}
