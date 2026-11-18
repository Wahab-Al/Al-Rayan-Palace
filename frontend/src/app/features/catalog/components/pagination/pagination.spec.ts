import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pagination } from './pagination';

describe('Pagination', () => {
  let component: Pagination;
  let fixture: ComponentFixture<Pagination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pagination],
    }).compileComponents();

    fixture = TestBed.createComponent(Pagination);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('currentPage', 2);
    fixture.componentRef.setInput('totalPages', 4);
    fixture.detectChanges();
  });

  it('creates a page list from its required inputs', () => {
    expect(component).toBeTruthy();
    expect(component.pages()).toEqual([1, 2, 3, 4]);
  });

  it('emits only valid page changes', () => {
    const pageChange = vi.fn();
    component.pageChange.subscribe(pageChange);

    component.goToPage(3);
    component.goToPage(2);
    component.goToPage(5);

    expect(pageChange).toHaveBeenCalledOnce();
    expect(pageChange).toHaveBeenCalledWith(3);
  });
});