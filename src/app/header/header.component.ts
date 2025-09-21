import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { PokemonService, PokemonBasicInfo, TypeDetailResponse } from '../pokemon-list/pokemon.service';
import { FilterService } from '../filter.service';
import { CapitalizePipe } from '../capitalize.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CapitalizePipe],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Filter properties
  searchTerm: string = '';
  selectedTypes: string[] = [];
  allTypes: string[] = [];
  selectedGenerations: string[] = [];
  allGenerations: string[] = [];
  selectedAbilities: string[] = [];
  allAbilities: string[] = [];
  selectedWeaknesses: string[] = [];
  allWeaknesses: string[] = [];

  isSearching: boolean = false;
  isNewDialogVisible: boolean = false;

  private searchTerms = new Subject<string>();

  constructor(
    private pokemonService: PokemonService,
    private filterService: FilterService
  ) {}

  ngOnInit(): void {
    forkJoin({
      types: this.pokemonService.getAllTypes(),
      generations: this.pokemonService.getAllGenerations(),
      abilities: this.pokemonService.getAllAbilities(),
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ types, generations, abilities }) => {
        this.allTypes = types;
        this.allGenerations = generations;
        this.allAbilities = abilities;
      },
      error: (error: any) => {
        console.error('Failed to load filter data:', error);
      }
    });

    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.filterService.updateFilter({ searchTerm: term });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchTermChange(): void {
    this.searchTerms.next(this.searchTerm);
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.filterService.updateFilter({
      searchTerm: this.searchTerm,
      selectedTypes: this.selectedTypes,
      selectedGenerations: this.selectedGenerations,
      selectedAbilities: this.selectedAbilities,
      selectedWeaknesses: this.selectedWeaknesses
    });
  }

  resetSearch(): void {
    this.searchTerm = '';
    this.selectedTypes = [];
    this.selectedGenerations = [];
    this.selectedAbilities = [];
    this.selectedWeaknesses = [];
    this.filterService.resetFilters();
  }

  openNewDialog(): void {
    this.isNewDialogVisible = true;
  }

  closeNewDialog(): void {
    this.isNewDialogVisible = false;
  }

  applyAdvancedFilters(): void {
    this.closeNewDialog();
    this.applyFilters();
  }
}
