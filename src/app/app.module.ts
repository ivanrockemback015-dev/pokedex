import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import {PokemonService} from './pokemon-list/pokemon.service';
import {App} from './app';
import { CapitalizePipe } from './capitalize.pipe';

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    HttpClientModule,
    App,
    CapitalizePipe
  ],
  providers: [PokemonService],
})
export class AppModule { }
