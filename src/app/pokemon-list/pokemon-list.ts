import { Component, OnInit, OnDestroy } from '@angular/core';
import { PokemonService, PokemonDetail, PaginatedPokemonList, PokemonBasicInfo } from './pokemon.service';
import { CapitalizePipe } from '../capitalize.pipe';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, map as rxMap, switchMap, catchError } from 'rxjs/operators';

const FALLBACK_IMAGE_DATA_URI = 'data:image/svg+xml;utf8,<svg width=\'150\' height=\'150\' viewBox=\'0 0 150 150\' xmlns=\'http://www.w3.org/2000/svg\'><rect x=\'0\' y=\'0\' width=\'150\' height=\'150\' fill=\'%23E0E0E0\'/><path d=\'M10 140 L140 10 L140 140 Z M10 10 L140 10 L10 140 Z\' fill=\'%23999999\' stroke=\'%23666666\' stroke-width=\'5\'/></svg>';

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  templateUrl: './pokemon-list.html',
  imports: [CommonModule, CapitalizePipe, FormsModule],
  styleUrls: ['./pokemon-list.css']
})
export class PokemonListComponent implements OnInit, OnDestroy {
  pokemons: PokemonDetail[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  private intervalId: any;
  private destroy$ = new Subject<void>(); // Subject to handle unsubscription

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPokemons: number = 0;
  totalPages: number = 0;

  // Search and Filter properties
  searchTerm: string = '';
  selectedTypes: string[] = [];
  allTypes: string[] = [];
  selectedGenerations: string[] = [];
  allGenerations: string[] = [];
  selectedAbilities: string[] = [];
  allAbilities: string[] = [];
  selectedWeaknesses: string[] = [];
  allWeaknesses: string[] = [];
  private allDamageRelations: any = {};
  isSearching: boolean = false;
  private allPokemonBasicInfo: PokemonBasicInfo[] = [];
  private searchTerms = new Subject<string>();

  // Dialog properties
  isNewDialogVisible: boolean = false;

  // Fallback image data URI
  public readonly fallbackImageDataUri = FALLBACK_IMAGE_DATA_URI;

  constructor(private pokemonService: PokemonService) {}

  ngOnInit(): void {
    this.loadPokemons();
    this.pokemonService.getAllPokemonBasicInfo().subscribe({
      next: (data: PokemonBasicInfo[]) => {
        this.allPokemonBasicInfo = data;
      },
      error: (error: any) => {
        console.error('Failed to load all Pokémon basic info:', error);
      }
    });

    this.pokemonService.getAllTypes().subscribe({
      next: (data: string[]) => {
        this.allTypes = data;
      },
      error: (error: any) => {
        console.error('Failed to load Pokémon types:', error);
      }
    });

    this.pokemonService.getAllGenerations().subscribe({
      next: (data: string[]) => {
        this.allGenerations = data;
      },
      error: (error: any) => {
        console.error('Failed to load Pokémon generations:', error);
      }
    });

    this.pokemonService.getAllAbilities().subscribe({
      next: (data: string[]) => {
        this.allAbilities = data;
      },
      error: (error: any) => {
        console.error('Failed to load Pokémon abilities:', error);
      }
    });

    this.pokemonService.getAllDamageRelations().subscribe({
      next: (data: any) => {
        this.allDamageRelations = data;
        this.allWeaknesses = Object.keys(data); // Populate weaknesses with type names
      },
      error: (error: any) => {
        console.error('Failed to load damage relations:', error);
      }
    });

    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.searchPokemon(term);
    });
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPokemons(): void {
    if (this.searchTerm.trim() || this.selectedTypes.length > 0 || this.selectedGenerations.length > 0 || this.selectedAbilities.length > 0 || this.selectedWeaknesses.length > 0) {
      return;
    }

    this.isLoading = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    const offset = (this.currentPage - 1) * this.itemsPerPage;
    this.pokemonService.getPokemons(this.itemsPerPage, offset).subscribe({
      next: (data: PaginatedPokemonList) => {
        this.pokemons = data.pokemons.map((pokemon, index) => ({
          ...pokemon,
          showBack: index % 2 !== 0
        }));
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

  startImageToggle(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (!this.searchTerm.trim() && this.selectedTypes.length === 0 && this.selectedGenerations.length === 0 && this.selectedAbilities.length === 0 && this.selectedWeaknesses.length === 0) {
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
    event.stopPropagation();
    if (pokemon.cries && pokemon.cries.latest) {
      const audio = new Audio(pokemon.cries.latest);
      audio.play();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadPokemons();
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
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

      if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < this.totalPages) {
        if (endPage < this.totalPages - 1) {
          pages.push('...');
        }
        pages.push(this.totalPages);
      }
    }
    return pages;
  }

  onSearchTermChange(): void {
    this.selectedTypes = [];
    this.selectedGenerations = [];
    this.selectedAbilities = [];
    this.selectedWeaknesses = [];
    this.searchTerms.next(this.searchTerm);
  }

  onTypeChange(): void {
    this.searchTerm = '';
    this.selectedGenerations = [];
    this.selectedAbilities = [];
    this.selectedWeaknesses = [];
    this.applyFilters();
  }

  onGenerationChange(): void {
    this.searchTerm = '';
    this.selectedTypes = [];
    this.selectedAbilities = [];
    this.selectedWeaknesses = [];
    this.applyFilters();
  }

  onAbilityChange(): void {
    this.searchTerm = '';
    this.selectedTypes = [];
    this.selectedGenerations = [];
    this.selectedWeaknesses = [];
    this.applyFilters();
  }

  onWeaknessChange(): void {
    this.searchTerm = '';
    this.selectedTypes = [];
    this.selectedGenerations = [];
    this.selectedAbilities = [];
    this.applyFilters();
  }

  searchPokemon(term: string): void {
    this.searchTerm = term;
    this.applyFilters();
  }

  applyFilters(): void {
    this.isLoading = true;
    this.errorMessage = '';
    clearInterval(this.intervalId); // Stop image toggle during filtering

    // Start with an observable of all basic Pokémon info
    let currentFilteredBasicInfo$: Observable<PokemonBasicInfo[]> = of(this.allPokemonBasicInfo);

    // 1. Apply Search Term Filter (if active and not direct ID search)
    if (this.searchTerm.trim()) {
      const query = this.searchTerm.toLowerCase().trim();
      let pokemonId: number | undefined;

      if (!isNaN(Number(query))) {
        pokemonId = Number(query);
      }

      if (pokemonId) {
        // Direct ID search - this overrides all other filters
        this.pokemonService.getPokemonById(pokemonId).subscribe({
          next: (data: PokemonDetail) => {
            this.pokemons = [{ ...data, showBack: false }];
            this.totalPokemons = 1;
            this.totalPages = 1;
            this.isLoading = false;
            this.errorMessage = '';
          },
          error: (error: any) => {
            this.errorMessage = 'Pokémon não encontrado. Tente novamente.';
            this.pokemons = [];
            this.totalPokemons = 0;
            this.totalPages = 0;
            this.isLoading = false;
          }
        });
        return; // Exit applyFilters as we have a direct ID match
      } else {
        // Partial name search - filter from the current list
        currentFilteredBasicInfo$ = currentFilteredBasicInfo$.pipe(
          rxMap(list => list.filter(p => p.name.includes(query)))
        );
      }
    }

    // 2. Apply Type Filter
    if (this.selectedTypes.length > 0) {
      currentFilteredBasicInfo$ = currentFilteredBasicInfo$.pipe(
        switchMap(currentList => {
          const typeRequests = this.selectedTypes.map(type =>
            this.pokemonService.getPokemonByType(type).pipe(
              rxMap(details => details.map(d => ({name: d.name, url: `https://pokeapi.co/api/v2/pokemon/${d.id}/`})) as PokemonBasicInfo[])
            )
          );
          return forkJoin(typeRequests).pipe(
            rxMap(results => {
              const combinedFromTypes = results.flat() as PokemonBasicInfo[];
              const combinedNames = new Set(combinedFromTypes.map(p => p.name));
              // Intersect with currentList
              return currentList.filter(p => combinedNames.has(p.name));
            })
          );
        })
      );
    }

    // 3. Apply Generation Filter
    if (this.selectedGenerations.length > 0) {
      currentFilteredBasicInfo$ = currentFilteredBasicInfo$.pipe(
        switchMap(currentList => {
          const genRequests = this.selectedGenerations.map(gen =>
            this.pokemonService.getPokemonByGeneration(gen).pipe(
              rxMap(details => details.map(d => ({name: d.name, url: `https://pokeapi.co/api/v2/pokemon/${d.id}/`})) as PokemonBasicInfo[])
            )
          );
          return forkJoin(genRequests).pipe(
            rxMap(results => {
              const combinedFromGenerations = results.flat() as PokemonBasicInfo[];
              const combinedNames = new Set(combinedFromGenerations.map(p => p.name));
              // Intersect with currentList
              return currentList.filter(p => combinedNames.has(p.name));
            })
          );
        })
      );
    }

    // 4. Apply Ability Filter
    if (this.selectedAbilities.length > 0) {
      currentFilteredBasicInfo$ = currentFilteredBasicInfo$.pipe(
        switchMap(currentList => {
          const abilityRequests = this.selectedAbilities.map(ability =>
            this.pokemonService.getPokemonByAbility(ability).pipe(\
              rxMap(details => details.map(d => ({name: d.name, url: `https://pokeapi.co/api/v2/pokemon/${d.id}/`})) as PokemonBasicInfo[])\
        )\
        );\
          return forkJoin(abilityRequests).pipe(\
            rxMap(results => {\
              const combinedFromAbilities = results.flat() as PokemonBasicInfo[];\
              const combinedNames = new Set(combinedFromAbilities.map(p => p.name));\
              // Intersect with currentList\
              return currentList.filter(p => combinedNames.has(p.name));\
            })\
        );\
        })\
    );\
    }\
  \
    // 5. Weakness Filter\
    if (this.selectedWeaknesses.length > 0) {\
      currentFilteredBasicInfo$ = currentFilteredBasicInfo$.pipe(\
        switchMap(currentList => {\
          const weaknessRequests = this.selectedWeaknesses.map(weaknessType => {\
            const damageRelations = this.allDamageRelations[weaknessType];\
            if (damageRelations && damageRelations.damage_relations.double_damage_from.length > 0) {\
              const typesThatAreWeakToSelectedType = damageRelations.damage_relations.double_damage_from.map((t: any) => t.name);\
              const requests = typesThatAreWeakToSelectedType.map((type: string) => this.pokemonService.getPokemonByType(type).pipe(\
                rxMap((details: PokemonDetail[]) => details.map(d => ({name: d.name, url: `https://pokeapi.co/api/v2/pokemon/${d.id}/`})) as PokemonBasicInfo[])\
            ));\
              return forkJoin(requests).pipe(rxMap((results: PokemonBasicInfo[][]) => results.flat() as PokemonBasicInfo[]));\
            } else {\
              return of<PokemonBasicInfo[]>([]);\
            }\
          });\
          // forkJoin on weaknessRequests will give us an array of PokemonBasicInfo[] (for each selected weakness)\
          return forkJoin(weaknessRequests).pipe(\
            rxMap(results => {\
              const combinedFromWeaknesses = results.flat() as PokemonBasicInfo[];\
              const combinedNames = new Set(combinedFromWeaknesses.map(p => p.name));\
              // Intersect with currentList\
              return currentList.filter(p => combinedNames.has(p.name));\
            })\
        );\
        })\
    );\
    }\
  \
    // If no filters are selected, load the paginated list\
    if (!this.searchTerm.trim() && this.selectedTypes.length === 0 && this.selectedGenerations.length === 0 && this.selectedAbilities.length === 0 && this.selectedWeaknesses.length === 0) {\
      this.isSearching = false;\
      this.loadPokemons();\
      return;\
    }\
  \
    // Final subscription to the filtered list\
    currentFilteredBasicInfo$.pipe(\
      switchMap(finalFilteredBasicInfo => {\
        if (finalFilteredBasicInfo.length > 0) {\
          const pokemonDetailRequests = finalFilteredBasicInfo.map(p => this.pokemonService.getPokemonById(p.name));\
          return forkJoin(pokemonDetailRequests).pipe(\
            catchError(error => {\
              this.errorMessage = \'Falha ao carregar detalhes dos Pokémon filtrados.\';\
              this.pokemons = [];\
              this.totalPokemons = 0;\
              this.totalPages = 0;\
              this.isLoading = false;\
              return of([]); // Return an empty observable to complete the stream\
            })\
          );\
        } else {\
          return of([]); // No basic info results, so return empty details\
        }\
      }),\
      takeUntil(this.destroy$) // Ensure this final subscription is also cleaned up\
    ).subscribe({\n      next: (data: PokemonDetail[]) => {\n        this.updateFilteredPokemons(data);\n        this.isSearching = true; // Indicate that a search/filter is active\n      },\n      error: (error: any) => {\n        // Error already handled in the inner catchError, but this is a fallback\n        this.errorMessage = \'Falha ao aplicar os filtros (final).\';\n        this.pokemons = [];\n        this.totalPokemons = 0;\n        this.totalPages = 0;\n        this.isLoading = false;\n      }\n    });\n  }\n\n  private updateFilteredPokemons(filteredList: PokemonDetail[]): void {\n    this.pokemons = filteredList.map((pokemon, index) => ({\n      ...pokemon,\n      showBack: index % 2 !== 0\n    }));\n    this.totalPokemons = filteredList.length;\n    this.totalPages = Math.ceil(this.totalPokemons / this.itemsPerPage);\n    this.isLoading = false;\n    this.errorMessage = \'\';\n    // Do not start image toggle here, as it\'s for paginated view\n  }\n\n  resetSearch(): void {\n    this.searchTerm = \'\';\n    this.selectedTypes = [];\n    this.selectedGenerations = [];\n    this.selectedAbilities = [];\n    this.selectedWeaknesses = [];\n    this.isSearching = false;\n    this.errorMessage = \'\';\n    this.currentPage = 1;\n    this.loadPokemons(); // Reload the paginated list\n  }\n\n  openNewDialog(): void {\n    this.isNewDialogVisible = true;\n  }\n\n  closeNewDialog(): void {\n    this.isNewDialogVisible = false;\n  }\n\n  applyAdvancedFilters(): void {\n    this.closeNewDialog();\n    this.applyFilters();\n  }\n}\n"))
