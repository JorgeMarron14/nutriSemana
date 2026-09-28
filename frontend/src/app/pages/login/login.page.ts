import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonButton } from '@ionic/angular';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IonContent, IonInput, IonButton],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  email = '';
  password = '';
  cargando = signal(false);
  error = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

  entrar() {
    this.error.set(null);
    this.cargando.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigateByUrl('/tabs/planner');
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.error || 'No se pudo iniciar sesion');
      },
    });
  }
}
