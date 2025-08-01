import { ComponentFixture, TestBed, fakeAsync, flush, waitForAsync } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import * as chai from 'chai';
import * as chaiExclude from 'chai-exclude';
//@ts-ignore
chai.use(chaiExclude);
import { expect } from 'chai';

import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';
import { GlobalActions } from '@mm-actions/global';
import { SessionService } from '@mm-services/session.service';
import { Selectors } from '@mm-selectors/index';

describe('Facility Filter Component', () => {
  let component:FacilityFilterComponent;
  let fixture:ComponentFixture<FacilityFilterComponent>;
  let sessionService;
  let store;
  let placeHierarchyService;

  beforeEach(waitForAsync(() => {
    placeHierarchyService = {
      get: sinon.stub().resolves(),
      getDescendants: sinon.stub().resolves(),
    };

    sessionService = {
      isOnlineOnly: sinon.stub().returns(true),
    };

    return TestBed
      .configureTestingModule({
        imports: [
          BrowserAnimationsModule,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          FacilityFilterComponent,
        ],
        providers: [
          provideMockStore(),
          { provide: SessionService, useValue: sessionService },
          { provide: PlaceHierarchyService, useValue: placeHierarchyService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(FacilityFilterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        store = TestBed.inject(MockStore);
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create Facility Filter', () => {
    expect(component).to.exist;
  });

  describe('loadFacilities', () => {
    it('should load facilities', async () => {
      placeHierarchyService.get.resolves([]);
      await component.loadFacilities();
      expect(component.facilities).to.deep.equal([]);
    });

    it('should catch errors when loading facilities', async () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      placeHierarchyService.get.rejects({ some: 'err' });
      await component.loadFacilities();
      expect(component.facilities).to.deep.equal([]);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error loading facilities');
    });

    it('should sort and flatten facilities recursively', async () => {
      const facilities = [
        {
          _id: '1',
          doc: { name: 'not_first', },
          children: [
            {
              _id: '2',
              doc: { name: 'some_child' },
              children: [
                { _id: '3', doc: { name: 'seven' } },
                { _id: '4', doc: { name: 'five' } },
              ]
            }
          ]
        },
        {
          _id: '2',
          doc: { name: 'first' },
        },
        {
          _id: '3',
          doc: { name: 'alpha' },
          children: [
            {
              _id: 'a',
              doc: { name: 'nine' },
              children: [
                { _id: 'aa', doc: { name: 'oops' } },
                { _id: 'bb', doc: { name: 'lint' } },
              ]
            },
            {
              _id: 'b',
              doc: { name: 'eight' },
              children: [
                { _id: 'cc', doc: { name: 'enel' } },
                { _id: 'dd', doc: { name: 'kalas' } },
              ]
            },
          ],
        },
      ];

      placeHierarchyService.get.resolves(facilities);
      await component.loadFacilities();
      expect(component.facilities).excludingEvery('label').to.deep.equal([
        {
          _id: '3',
          doc: { name: 'alpha' },
          children: [
            {
              _id: 'b',
              doc: { name: 'eight' },
              children: [
                { _id: 'cc', doc: { name: 'enel' } },
                { _id: 'dd', doc: { name: 'kalas' } },
              ]
            },
            {
              _id: 'a',
              doc: { name: 'nine' },
              children: [
                { _id: 'bb', doc: { name: 'lint' } },
                { _id: 'aa', doc: { name: 'oops' } },
              ]
            },

          ],
        },
        {
          _id: '2',
          doc: { name: 'first' },
        },
        {
          _id: '1',
          doc: { name: 'not_first', },
          children: [
            {
              _id: '2',
              doc: { name: 'some_child' },
              children: [
                { _id: '4', doc: { name: 'five' } },
                { _id: '3', doc: { name: 'seven' } },
              ]
            }
          ]
        },
      ]);
    });

    it('should not load facilities if sidebar is close', fakeAsync(() => {
      const facilities = [{
        _id: '1',
        doc: { name: 'not_first', },
        children: [
          {
            _id: '2',
            doc: { name: 'some_child' },
            children: [
              { _id: '3', doc: { name: 'seven' } },
              { _id: '4', doc: { name: 'five' } },
            ],
          },
        ],
      }];

      placeHierarchyService.get.resolves(facilities);
      store.overrideSelector(Selectors.getSidebarFilter, { isOpen: false });
      store.refreshState();

      component.ngAfterViewInit();
      flush();

      expect(component.facilities.length).to.equal(0);
    }));

    it('should not load facilities if sidebar is open', fakeAsync(() => {
      const facilities = [{
        _id: '1',
        doc: { name: 'not_first', },
        children: [
          {
            _id: '2',
            doc: { name: 'some_child' },
            children: [
              { _id: '3', doc: { name: 'seven' } },
              { _id: '4', doc: { name: 'five' } },
            ],
          },
        ],
      }];

      component.facilities = [];
      placeHierarchyService.get.resolves(facilities);
      store.overrideSelector(Selectors.getSidebarFilter, { isOpen: true });
      store.refreshState();

      component.ngAfterViewInit();
      flush();

      expect(component.facilities).excludingEvery('label').to.have.deep.members([{
        _id: '1',
        doc: { name: 'not_first', },
        children: [
          {
            _id: '2',
            doc: { name: 'some_child' },
            children: [
              { _id: '4', doc: { name: 'five' } },
              { _id: '3', doc: { name: 'seven' } },
            ],
          },
        ],
      }]);
    }));
  });

  it('should apply filter correctly', () => {
    const facilities = [ '', '123' ];
    const spySearch = sinon.spy(component.search, 'emit');
    component.applyFilter(facilities);
    expect(spySearch.callCount).to.equal(1);
  });

  it('should return unique value when calling trackByFn', () => {
    const facility = { doc: { _id: 'a', _rev: 'b' } };
    expect(component.trackByFn(0, facility)).to.equal('ab');
  });

  it('should toggle all children when toggling parent in the filter', () => {
    const filterToggleSpy = sinon.spy(component.filter, 'toggle');
    const facility = {
      _id: 'parent',
      doc: { _id: 'parent' },
      children: [
        {
          _id: 'child1',
          doc: { _id: 'child1' },
          children: [{
            _id: 'child3',
            doc: { _id: 'child3' },
            children: [{ _id: 'child4', doc: { _id: 'child4' } }],
          }],
        },
        { _id: 'child2', doc: { _id: 'child2'} },
      ]
    };

    component.select(null, facility, true);

    expect(filterToggleSpy.callCount).to.equal(5);
    expect(filterToggleSpy.args).to.deep.equal([
      [ 'parent' ], [ 'child1' ], [ 'child3' ], [ 'child4' ], [ 'child2' ],
    ]);
  });

  it('should toggle unselected children when toggling parent in the filter', () => {
    const filterToggleSpy = sinon.spy(component.filter, 'toggle');
    const facility = {
      _id: 'parent',
      doc: { _id: 'parent' },
      children: [
        {
          _id: 'child1',
          doc: { _id: 'child1' },
          children: [{
            _id: 'child3',
            doc: { _id: 'child3' },
            children: [{ _id: 'child4', doc: { _id: 'child4' } }],
          }],
        },
        { _id: 'child2', doc: { _id: 'child2'} },
      ]
    };
    component.filter.selected.add(facility.children[0].children![0].doc._id);
    component.filter.selected.add(facility.children[1].doc._id);

    component.select(null, facility, true);

    expect(filterToggleSpy.callCount).to.equal(3);
    expect(filterToggleSpy.args).to.deep.equal([ [ 'parent' ], [ 'child1' ], [ 'child4' ] ]);
  });

  describe('getLabel', () => {
    it('should return the facility name, if existent', async () => {
      const facility = { doc: { name: 'fancy' } };
      expect(await component.itemLabel(facility)).to.equal('fancy');
    });

    it('should return deleted for admins when name is not set', async () => {
      const facility = { doc: { _id: 'fancy' } };
      expect(await component.itemLabel(facility)).to.equal('place.deleted');
    });

    it('should return unavailable for offline users when name is not set', async() => {
      sessionService.isOnlineOnly.returns(false);
      component.ngOnInit();
      fixture.detectChanges();
      const facility = { doc: { _id: 'fancy' } };
      expect(await component.itemLabel(facility)).to.equal('place.unavailable');
    });
  });

  it('should clear the filter', () => {
    const filterClearSpy = sinon.spy(component.filter, 'clear');
    component.filter.selected.add('place-1');
    component.filter.selected.add('place-2');

    component.clear();

    expect(filterClearSpy.calledOnce).to.be.true;
    expect(component.filter.selected.size).to.equal(0);
  });

  it('should count selected items in the filter', () => {
    const filterCountSelectedSpy = sinon.spy(component.filter, 'countSelected');
    component.filter.selected.add('place-1');
    component.filter.selected.add('place-2');

    const result = component.countSelected();

    expect(filterCountSelectedSpy.calledOnce).to.be.true;
    expect(result).to.equal(2);
  });

  it('should set correct selected facility ids when filter is not disabled', () => {
    const setFilter = sinon.stub(GlobalActions.prototype, 'setFilter');
    const selectedFacilities = [ 'one', 'child1', 'child2', 'parent1' ];

    component.applyFilter(selectedFacilities);

    expect(setFilter.callCount).to.equal(1);
    expect(setFilter.args[0]).to.deep.equal([
      { facilities: { selected: ['one', 'child1', 'child2', 'parent1'] } }
    ]);
  });

  it('should do nothing if component is disabled', () => {
    const filterClearSpy = sinon.spy(component.filter, 'clear');
    const filterToggleSpy = sinon.spy(component.filter, 'toggle');
    const spySearch = sinon.spy(component.search, 'emit');
    const facilities = [ '123' ];
    component.disabled = true;

    component.clear();
    component.applyFilter(facilities);
    component.select(null, facilities[0], true);
    component.clear();

    expect(spySearch.notCalled).to.be.true;
    expect(filterClearSpy.notCalled).to.be.true;
    expect(filterToggleSpy.notCalled).to.be.true;
  });

  describe('setDefault', () => {
    it('should set default value to filter when facility found', fakeAsync(() => {
      const facilities = [
        { _id: 'child-1', doc: {  _id: 'child-1', name: 'not_first' } },
        { _id: 'child-2', doc: { _id: 'child-2', name: 'first' } },
      ];
      component.facilities = [{ _id: 'parent' }];
      placeHierarchyService.getDescendants.resolves(facilities);
      const searchSpy = sinon.spy(component.search, 'emit');
      const setFilterStub = sinon.stub(GlobalActions.prototype, 'setFilter');

      component.setDefault({ _id: 'parent' });
      flush();

      expect(searchSpy.calledOnce).to.be.true;
      expect(setFilterStub.calledOnce).to.be.true;
      expect(setFilterStub.args[0][0]).to.deep.equal({ facilities: { selected: [ 'parent', 'child-1', 'child-2' ] } });
    }));

    it('should not default value when facility is undefined', fakeAsync(() => {
      const facilities = [
        { _id: 'child-1', doc: {  _id: 'child-1', name: 'not_first' } },
        { _id: 'child-2', doc: { _id: 'child-2', name: 'first' } },
      ];
      placeHierarchyService.getDescendants.resolves(facilities);
      const searchSpy = sinon.spy(component.search, 'emit');
      const setFilterStub = sinon.stub(GlobalActions.prototype, 'setFilter');

      component.setDefault(undefined);
      flush();

      expect(searchSpy.calledOnce).to.be.true;
      expect(setFilterStub.calledOnce).to.be.true;
      expect(setFilterStub.args[0][0]).to.deep.equal({ facilities: undefined });
    }));
  });
});
