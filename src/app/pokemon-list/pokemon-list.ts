import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of, Subject, Observable } from 'rxjs';
import { switchMap, map, catchError, takeUntil } from 'rxjs/operators';

import { PokemonService, PokemonDetail, PaginatedPokemonList, PokemonBasicInfo } from './pokemon.service';
import { FilterService, FilterState } from '../filter.service';
import { CapitalizePipe } from '../capitalize.pipe';

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [CommonModule, RouterLink, CapitalizePipe],
  templateUrl: './pokemon-list.html',
  styleUrls: ['./pokemon-list.css']
})
export class PokemonListComponent implements OnInit, OnDestroy {
  pokemons: PokemonDetail[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  private intervalId: any;
  private destroy$ = new Subject<void>();

  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPokemons: number = 0;
  totalPages: number = 0;

  isSearching: boolean = false;
  public readonly fallbackImageDataUri = 'data:image/svg+xml;utf8,<svg width=\'150\' height=\'150\' viewBox=\'0 0 150 150\' xmlns=\'http://www.w3.org/2000/svg\'><rect x=\'0\' y=\'0\' width=\'150\' height=\'150\' fill=\'%23E0E0E0\'/><path d=\'M10 140 L140 10 L140 140 Z M10 10 L140 10 L10 140 Z\' fill=\'%23999999\' stroke=\'%23666666\' stroke-width=\'5\'/></svg>';

  constructor(
    private pokemonService: PokemonService,
    private filterService: FilterService
  ) {}

  ngOnInit(): void {
    this.filterService.filterState$.pipe(
      takeUntil(this.destroy$),
      switchMap(filterState => this.applyFilters(filterState))
    ).subscribe({
      next: (pokemonDetails) => {
        this.updateFilteredPokemons(pokemonDetails);
      },
      error: (err) => {
        console.error('An unexpected error occurred in the filter chain:', err);
        this.errorMessage = 'Ocorreu um erro inesperado ao aplicar os filtros.';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPaginatedPokemons(): void {
    this.isLoading = true;
    this.isSearching = false;
    clearInterval(this.intervalId);
    const offset = (this.currentPage - 1) * this.itemsPerPage;
    this.pokemonService.getPokemons(this.itemsPerPage, offset).subscribe({
      next: (data: PaginatedPokemonList) => {
        this.pokemons = data.pokemons.map((pokemon, index) => ({ ...pokemon, showBack: index % 2 !== 0 }));
        this.totalPokemons = data.totalCount;
        this.totalPages = Math.ceil(this.totalPokemons / this.itemsPerPage);
        this.isLoading = false;
        this.startImageToggle();
      },
      error: (error: any) => {
        this.errorMessage = 'Falha ao carregar os Pokémon';
        this.isLoading = false;
      }
    });
  }

  applyFilters(filterState: FilterState): Observable<PokemonDetail[]> {
    this.isLoading = true;
    this.errorMessage = '';
    clearInterval(this.intervalId);

    const { searchTerm, selectedTypes, selectedGenerations, selectedAbilities, selectedWeaknesses } = filterState;

    const noFiltersApplied = !searchTerm.trim() && selectedTypes.length === 0 && selectedGenerations.length === 0 && selectedAbilities.length === 0 && selectedWeaknesses.length === 0;

    if (noFiltersApplied) {
      this.loadPaginatedPokemons();
      return of([]);
    }

    let filteredPokemon$: Observable<PokemonBasicInfo[]> = this.pokemonService.getAllPokemonBasicInfo();

    return filteredPokemon$.pipe(
      switchMap(allPokemon => {
        const activeFilters: Observable<PokemonBasicInfo[]>[] = [];

        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase().trim();
          activeFilters.push(of(allPokemon.filter(p => p.name.includes(query))));
        }

        if (selectedTypes.length > 0) {
          const typeRequests = selectedTypes.map(type => this.pokemonService.getPokemonByType(type));
          activeFilters.push(forkJoin(typeRequests).pipe(map(results => results.flat())));
        }

        if (selectedGenerations.length > 0) {
          const genRequests = selectedGenerations.map(gen => this.pokemonService.getPokemonByGeneration(gen));
          activeFilters.push(forkJoin(genRequests).pipe(map(results => results.flat())));
        }

        if (selectedAbilities.length > 0) {
          const abilityRequests = selectedAbilities.map(ability => this.pokemonService.getPokemonByAbility(ability));
          activeFilters.push(forkJoin(abilityRequests).pipe(map(results => results.flat())));
        }

        return forkJoin(activeFilters).pipe(
          map(results => {
            if (results.length === 0) return allPokemon;
            let intersection = new Map<string, PokemonBasicInfo>();
            results[0].forEach(p => intersection.set(p.url, p));

            for (let i = 1; i < results.length; i++) {
              const currentUrls = new Set(results[i].map(p => p.url));
              for (const url of intersection.keys()) {
                if (!currentUrls.has(url)) {
                  intersection.delete(url);
                }
              }
            }
            return Array.from(intersection.values());
          })
        );
      }),
      switchMap(basicInfo => {
        if (basicInfo.length === 0) {
          return of([]);
        }
        const detailRequests = basicInfo.map(p => {
          const urlParts = p.url.split('/').filter(Boolean);
          const id = urlParts[urlParts.length - 1];
          return this.pokemonService.getPokemonById(id).pipe(
            catchError(err => {
              console.error(`Failed to fetch details for ${p.name} (ID: ${id}):`, err);
              return of(null);
            })
          );
        });
        return forkJoin(detailRequests);
      }),
      map(details => details.filter((p): p is PokemonDetail => p !== null))
    );
  }

  private updateFilteredPokemons(filteredList: PokemonDetail[]): void {
    this.pokemons = filteredList.map((pokemon, index) => ({ ...pokemon, showBack: index % 2 !== 0 }));
    this.totalPokemons = filteredList.length;
    this.totalPages = 1;
    this.currentPage = 1;
    this.isLoading = false;
    this.errorMessage = '';
    this.isSearching = true;
  }

  startImageToggle(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (!this.isSearching) {
      this.intervalId = setInterval(() => {
        this.pokemons.forEach(pokemon => {
          if (pokemon.sprites.back_default) {
            pokemon.showBack = !pokemon.showBack;
          }
        });
      }, 3000);
    }
  }

  playSound(pokemon: PokemonDetail, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (pokemon.cries && pokemon.cries.latest) {
      const audio = new Audio(pokemon.cries.latest);
      audio.play();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadPaginatedPokemons();
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  get pageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
      if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }
      for (let i = startPage; i <= endPage; i++) pages.push(i);
      if (endPage < this.totalPages) {
        if (endPage < this.totalPages - 1) pages.push('...');
        pages.push(this.totalPages);
      }
    }
    return pages;
  }
}
