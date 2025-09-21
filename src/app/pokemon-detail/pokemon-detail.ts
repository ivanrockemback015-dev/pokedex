import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PokemonService, PokemonDetail } from '../pokemon-list/pokemon.service';
import { CommonModule } from '@angular/common';
import { CapitalizePipe } from '../capitalize.pipe';
import { RouterLink } from '@angular/router';

const FALLBACK_IMAGE_DATA_URI = 'data:image/svg+xml;utf8,<svg width=\'150\' height=\'150\' viewBox=\'0 0 150 150\' xmlns=\'http://www.w3.org/2000/svg\'><circle cx=\'75\' cy=\'75\' r=\'70\' fill=\'%23E0E0E0\' stroke=\'%23B0B0B0\' stroke-width=\'3\'/><rect x=\'0\' y=\'72.5\' width=\'150\' height=\'5\' fill=\'%23B0B0B0\'/><circle cx=\'75\' cy=\'75\' r=\'20\' fill=\'%23E0E0E0\' stroke=\'%23B0B0B0\' stroke-width=\'3\'/><circle cx=\'75\' cy=\'75\' r=\'50\' fill=\'%23FF0000\' stroke=\'%23CC0000\' stroke-width=\'4\'/><line x1=\'45\' y1=\'105\' x2=\'105\' y2=\'45\' stroke=\'%23FFFFFF\' stroke-width=\'8\' stroke-linecap=\'round\'/></svg>';

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [CommonModule, CapitalizePipe, RouterLink],
  templateUrl: './pokemon-detail.html',
  styleUrls: ['./pokemon-detail.css']
})
export class PokemonDetailComponent implements OnInit {
  pokemon: PokemonDetail | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  currentImageUrl: string = '';

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.pokemonService.getPokemonById(+id).subscribe({
        next: (data: PokemonDetail) => {
          this.pokemon = data;
          this.currentImageUrl = (this.pokemon.sprites.other['official-artwork'].front_default || FALLBACK_IMAGE_DATA_URI) as string;
          this.isLoading = false;
        },
        error: (error: any) => {
          this.errorMessage = 'Pokémon não encontrado';
          this.isLoading = false;
        }
      });
    }
  }

  playSound(pokemon: PokemonDetail, event: MouseEvent): void {
    event.stopPropagation();
    if (pokemon.cries && pokemon.cries.latest) {
      const audio = new Audio(pokemon.cries.latest);
      audio.play();
    }
  }
}
