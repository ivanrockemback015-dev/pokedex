import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: { name: string; url: string }[];
}

interface TypeListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: { name: string; url: string }[];
}

interface TypeDetailResponse {
  damage_relations: {
    double_damage_from: { name: string; url: string }[];
    double_damage_to: { name: string; url: string }[];
    half_damage_from: { name: string; url: string }[];
    half_damage_to: { name: string; url: string }[];
    no_damage_from: { name: string; url: string }[];
    no_damage_to: { name: string; url: string }[];
  };
  name: string;
}

interface GenerationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: { name: string; url: string }[];
}

interface AbilityListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: { name: string; url: string }[];
}

interface PokemonOfTypeResponse {
  pokemon: { pokemon: { name: string; url: string } }[];
}

interface PokemonOfGenerationResponse {
  pokemon_species: { name: string; url: string }[];
}

interface PokemonOfAbilityResponse {
  pokemon: { pokemon: { name: string; url: string } }[];
}

export interface PokemonBasicInfo {
  name: string;
  url: string;
}

export interface PokemonDetail {
  id: number;
  name: string;
  sprites: {
    front_default: string | null;
    back_default: string | null;
    other: {
      'official-artwork': {
        front_default: string | null;
        front_shiny: string | null;
      };
    };
    versions: {
      'generation-v': {
        'black-white': {
          animated: {
            front_default: string | null;
          };
        };
      };
    };
  };
  types: {
    slot: number;
    type: {
      name: string;
      url: string;
    };
  }[];
  cries: {
    latest: string | null;
  };
  showBack?: boolean;
}

export interface PaginatedPokemonList {
  pokemons: PokemonDetail[];
  totalCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private apiUrl = 'https://pokeapi.co/api/v2/pokemon';
  private typeApiUrl = 'https://pokeapi.co/api/v2/type';
  private generationApiUrl = 'https://pokeapi.co/api/v2/generation';
  private abilityApiUrl = 'https://pokeapi.co/api/v2/ability';

  constructor(private http: HttpClient) { }

  getPokemons(limit: number = 20, offset: number = 0): Observable<PaginatedPokemonList> {
    return this.http.get<PokemonListResponse>(`${this.apiUrl}?limit=${limit}&offset=${offset}`).pipe(
      switchMap(response => {
        if (!response || !response.results || response.results.length === 0) {
          return of({ pokemons: [], totalCount: response.count || 0 });
        }
        const pokemonRequests: Observable<PokemonDetail>[] = response.results.map(pokemon =>
          this.http.get<PokemonDetail>(pokemon.url)
        );
        return forkJoin(pokemonRequests).pipe(
          map(pokemons => ({ pokemons, totalCount: response.count }))
        );
      })
    );
  }

  getPokemonById(idOrName: string | number): Observable<PokemonDetail> {
    return this.http.get<PokemonDetail>(`${this.apiUrl}/${idOrName}`);
  }

  getAllPokemonBasicInfo(): Observable<PokemonBasicInfo[]> {
    // Fetch a very large number to get all Pokémon names
    return this.http.get<PokemonListResponse>(`${this.apiUrl}?limit=10000`).pipe(
      map(response => response.results.map(result => ({ name: result.name, url: result.url })))
    );
  }

  getAllTypes(): Observable<string[]> {
    return this.http.get<TypeListResponse>(this.typeApiUrl).pipe(
      map(response => response.results.map(type => type.name))
    );
  }

  getPokemonByType(type: string): Observable<PokemonDetail[]> {
    return this.http.get<PokemonOfTypeResponse>(`${this.typeApiUrl}/${type}`).pipe(
      switchMap(response => {
        if (!response || !response.pokemon || response.pokemon.length === 0) {
          return of<PokemonDetail[]>([]);
        }
        const pokemonRequests: Observable<PokemonDetail>[] = response.pokemon.map(p =>
          this.http.get<PokemonDetail>(p.pokemon.url)
        );
        return forkJoin(pokemonRequests);
      })
    );
  }

  getAllGenerations(): Observable<string[]> {
    return this.http.get<GenerationListResponse>(this.generationApiUrl).pipe(
      map(response => response.results.map(gen => gen.name))
    );
  }

  getPokemonByGeneration(generation: string): Observable<PokemonDetail[]> {
    return this.http.get<PokemonOfGenerationResponse>(`${this.generationApiUrl}/${generation}`).pipe(
      switchMap(response => {
        if (!response || !response.pokemon_species || response.pokemon_species.length === 0) {
          return of<PokemonDetail[]>([]);
        }
        const pokemonRequests: Observable<PokemonDetail>[] = response.pokemon_species.map(p =>
          this.http.get<PokemonDetail>(`${this.apiUrl}/${p.name}`)
        );
        return forkJoin(pokemonRequests);
      })
    );
  }

  getAllAbilities(): Observable<string[]> {
    return this.http.get<AbilityListResponse>(this.abilityApiUrl).pipe(
      map(response => response.results.map(ability => ability.name))
    );
  }

  getPokemonByAbility(ability: string): Observable<PokemonDetail[]> {
    return this.http.get<PokemonOfAbilityResponse>(`${this.abilityApiUrl}/${ability}`).pipe(
      switchMap(response => {
        if (!response || !response.pokemon || response.pokemon.length === 0) {
          return of<PokemonDetail[]>([]);
        }
        const pokemonRequests: Observable<PokemonDetail>[] = response.pokemon.map(p =>
          this.http.get<PokemonDetail>(p.pokemon.url)
        );
        return forkJoin(pokemonRequests);
      })
    );
  }

  getAllDamageRelations(): Observable<{ [key: string]: TypeDetailResponse }> {
    return this.http.get<TypeListResponse>(this.typeApiUrl).pipe(
      switchMap(response => {
        const typeDetailRequests = response.results.map(type =>
          this.http.get<TypeDetailResponse>(type.url).pipe(
            map(detail => ({ [detail.name]: detail }))
          )
        );
        return forkJoin(typeDetailRequests).pipe(
          map(results => Object.assign({}, ...results)) // Combine all type details into a single object
        );
      })
    );
  }
}
