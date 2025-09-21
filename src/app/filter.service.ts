import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FilterState {
  searchTerm: string;
  selectedTypes: string[];
  selectedGenerations: string[];
  selectedAbilities: string[];
  selectedWeaknesses: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private _filterState = new BehaviorSubject<FilterState>({
    searchTerm: '',
    selectedTypes: [],
    selectedGenerations: [],
    selectedAbilities: [],
    selectedWeaknesses: []
  });

  readonly filterState$: Observable<FilterState> = this._filterState.asObservable();

  updateFilter(newFilterState: Partial<FilterState>): void {
    const currentFilterState = this._filterState.getValue();
    this._filterState.next({ ...currentFilterState, ...newFilterState });
  }

  resetFilters(): void {
    this._filterState.next({
      searchTerm: '',
      selectedTypes: [],
      selectedGenerations: [],
      selectedAbilities: [],
      selectedWeaknesses: []
    });
  }

  get currentFilterState(): FilterState {
    return this._filterState.getValue();
  }
}
