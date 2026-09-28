import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterLink,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  documentTextOutline,
  cartOutline,
  chatbubbleEllipsesOutline,
  settingsOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [RouterLink, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterLink],
  templateUrl: './tabs.page.html',
})
export class TabsPage {
  constructor() {
    addIcons({ calendarOutline, documentTextOutline, cartOutline, chatbubbleEllipsesOutline, settingsOutline });
  }
}
