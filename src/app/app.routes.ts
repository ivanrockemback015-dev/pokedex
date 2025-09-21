import { Routes } from '@angular/router';
import { PokemonListComponent } from './pokemon-list/pokemon-list';
import { PokemonDetailComponent } from './pokemon-detail/pokemon-detail';

export const routes: Routes = [
  { path: '', component: PokemonListComponent },
  { path: 'pokemon/:id', component: PokemonDetailComponent }
];
