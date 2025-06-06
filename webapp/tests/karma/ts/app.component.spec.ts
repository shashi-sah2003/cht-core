import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router, ActivationEnd } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { of, Subject } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { AppComponent } from '../../../src/ts/app.component';
import { DBSyncService } from '@mm-services/db-sync.service';
import { LanguageService, SetLanguageService } from '@mm-services/language.service';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { ResourceIconsService } from '@mm-services/resource-icons.service';
import { ChangesService } from '@mm-services/changes.service';
import { UpdateServiceWorkerService } from '@mm-services/update-service-worker.service';
import { LocationService } from '@mm-services/location.service';
import { ModalService } from '@mm-services/modal.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { JsonFormsService } from '@mm-services/json-forms.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { CountMessageService } from '@mm-services/count-message.service';
import { PrivacyPoliciesService } from '@mm-services/privacy-policies.service';
import { RouteSnapshotService } from '@mm-services/route-snapshot.service';
import { CheckDateService } from '@mm-services/check-date.service';
import { UnreadRecordsService } from '@mm-services/unread-records.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { RecurringProcessManagerService } from '@mm-services/recurring-process-manager.service';
import { WealthQuintilesWatcherService } from '@mm-services/wealth-quintiles-watcher.service';
import { GlobalActions } from '@mm-actions/global';
import { SnackbarComponent } from '@mm-components/snackbar/snackbar.component';
import { DatabaseConnectionMonitorService } from '@mm-services/database-connection-monitor.service';
import { DatabaseClosedComponent } from '@mm-modals/database-closed/database-closed.component';
import { BrowserCompatibilityComponent } from '@mm-modals/browser-compatibility/browser-compatibility.component';
import { TranslateLocaleService } from '@mm-services/translate-locale.service';
import { BrowserDetectorService } from '@mm-services/browser-detector.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TransitionsService } from '@mm-services/transitions.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { AnalyticsActions } from '@mm-actions/analytics';
import { AnalyticsModulesService } from '@mm-services/analytics-modules.service';
import { Selectors } from '@mm-selectors/index';
import { TrainingCardsService } from '@mm-services/training-cards.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { FormService } from '@mm-services/form.service';
import { OLD_NAV_PERMISSION } from '@mm-components/header/header.component';
import { SidebarMenuComponent } from '@mm-components/sidebar-menu/sidebar-menu.component';
import { ReloadingComponent } from '@mm-modals/reloading/reloading.component';
import { StorageInfoService } from '@mm-services/storage-info.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let store;
  let clock;
  let router;

  // Services
  let dbSyncService;
  let languageService;
  let sessionService;
  let authService;
  let resourceIconsService;
  let changesService;
  let locationService;
  let xmlFormsService;
  let jsonFormsService;
  let countMessageService;
  let privacyPoliciesService;
  let checkDateService;
  let rulesEngineService;
  let recurringProcessManagerService;
  let formatDateService;
  let feedbackService;
  let wealthQuintilesWatcherService;
  let unreadRecordsService;
  let setLanguageService;
  let translateService;
  let modalService;
  let browserDetectorService;
  let databaseConnectionMonitorService;
  let translateLocaleService;
  let telemetryService;
  let transitionsService;
  let chtDatasourceService;
  let analyticsModulesService;
  let trainingCardsService;
  let userSettingsService;
  let formService;
  let updateServiceWorkerService;
  let storageInfoService;
  // End Services

  let globalActions;
  let analyticsActions;
  let originalPouchDB;
  const changesListener:any = {};
  let consoleErrorStub;

  const getComponent = () => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    // set this in index.html
    window.startupTimes = {};

    authService = { has: sinon.stub().resolves(true) };
    locationService = { path: 'localhost' };
    checkDateService = { check: sinon.stub() };
    countMessageService = { init: sinon.stub() };
    feedbackService = { init: sinon.stub(), submit: sinon.stub().returns({}) };
    xmlFormsService = { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) };
    jsonFormsService = { get: sinon.stub().resolves([]) };
    languageService = { get: sinon.stub().resolves({}) };
    rulesEngineService = { isEnabled: sinon.stub().resolves(true) };
    resourceIconsService = { getAppTitle: sinon.stub().resolves() };
    privacyPoliciesService = { hasAccepted: sinon.stub().resolves() };
    formatDateService = { init: sinon.stub() };
    wealthQuintilesWatcherService = { start: sinon.stub() };
    unreadRecordsService = { init: sinon.stub() };
    setLanguageService = { set: sinon.stub() };
    translateService = { instant: sinon.stub().returnsArg(0) };
    modalService = {
      show: sinon.stub().returns({
        afterClosed: sinon.stub().returns(of())
      })
    };
    browserDetectorService = { isUsingOutdatedBrowser: sinon.stub().returns(false) };
    chtDatasourceService = { isInitialized: sinon.stub() };
    analyticsModulesService = { get: sinon.stub() };
    databaseConnectionMonitorService = {
      listenForDatabaseClosed: sinon.stub().returns(of())
    };
    recurringProcessManagerService = {
      startUpdateRelativeDate: sinon.stub(),
      startUpdateReadDocsCount: sinon.stub(),
      stopUpdateReadDocsCount: sinon.stub()
    };
    changesService = {
      subscribe: options => changesListener[options.key] = options
    };
    sessionService = {
      init: sinon.stub().resolves(),
      isAdmin: sinon.stub().returns(false),
      userCtx: sinon.stub(),
      isOnlineOnly: sinon.stub()
    };
    dbSyncService = {
      addUpdateListener: sinon.stub(),
      isEnabled: sinon.stub().returns(false),
      sync: sinon.stub(),
      isSyncInProgress: sinon.stub(),
      subscribe: sinon.stub()
    };
    translateLocaleService = { reloadLang: sinon.stub() };
    transitionsService = { init: sinon.stub() };
    
    storageInfoService = { init: sinon.stub(), stop: sinon.stub() };

    router = { navigate: sinon.stub(), events: of(ActivationEnd) };

    globalActions = {
      updateReplicationStatus: sinon.stub(GlobalActions.prototype, 'updateReplicationStatus'),
      setPrivacyPolicyAccepted: sinon.stub(GlobalActions.prototype, 'setPrivacyPolicyAccepted'),
      setShowPrivacyPolicy: sinon.stub(GlobalActions.prototype, 'setShowPrivacyPolicy'),
      setForms: sinon.stub(GlobalActions.prototype, 'setForms'),
      setUserFacilityIds: sinon.stub(GlobalActions.prototype, 'setUserFacilityIds'),
      setUserContactId: sinon.stub(GlobalActions.prototype, 'setUserContactId'),
    };
    analyticsActions = {
      setAnalyticsModules: sinon.stub(AnalyticsActions.prototype, 'setAnalyticsModules')
    };
    originalPouchDB = window.PouchDB;
    window.PouchDB = {
      fetch: sinon.stub()
    };
    telemetryService = { record: sinon.stub() };
    trainingCardsService = { initTrainingCards: sinon.stub() };
    userSettingsService = { get: sinon.stub().resolves({ facility_id: ['facility'], contact_id: 'contact' }) };
    formService = { setUserContext: sinon.stub() };
    updateServiceWorkerService = { update: sinon.stub() };
    consoleErrorStub = sinon.stub(console, 'error');

    const mockedSelectors = [
      { selector: Selectors.getSidebarFilter, value: {} },
    ];

    await TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          SnackbarComponent,
          SidebarMenuComponent,
          AppComponent,
        ],
        providers: [
          provideAnimations(),
          provideMockStore({ selectors: mockedSelectors }),
          { provide: DBSyncService, useValue: dbSyncService },
          { provide: TranslateService, useValue: translateService },
          { provide: LanguageService, useValue: languageService },
          { provide: SetLanguageService, useValue: setLanguageService },
          { provide: SessionService, useValue: sessionService },
          { provide: AuthService, useValue: authService },
          { provide: ResourceIconsService, useValue: resourceIconsService },
          { provide: ChangesService, useValue: changesService },
          { provide: UpdateServiceWorkerService, useValue: updateServiceWorkerService },
          { provide: LocationService, useValue: locationService },
          { provide: ModalService, useValue: modalService },
          { provide: BrowserDetectorService, useValue: browserDetectorService },
          { provide: FeedbackService, useValue: feedbackService },
          { provide: FormatDateService, useValue: formatDateService },
          { provide: XmlFormsService, useValue: xmlFormsService },
          { provide: JsonFormsService, useValue: jsonFormsService },
          { provide: TranslateFromService, useValue: {} },
          { provide: CountMessageService, useValue: countMessageService },
          { provide: PrivacyPoliciesService, useValue: privacyPoliciesService },
          { provide: RouteSnapshotService, useValue: {} },
          { provide: CheckDateService, useValue: checkDateService },
          { provide: UnreadRecordsService, useValue: unreadRecordsService },
          { provide: RulesEngineService, useValue: rulesEngineService },
          { provide: RecurringProcessManagerService, useValue: recurringProcessManagerService },
          { provide: WealthQuintilesWatcherService, useValue: wealthQuintilesWatcherService },
          { provide: DatabaseConnectionMonitorService, useValue: databaseConnectionMonitorService },
          { provide: TranslateLocaleService, useValue: translateLocaleService },
          { provide: TelemetryService, useValue: telemetryService },
          { provide: TransitionsService, useValue: transitionsService },
          { provide: CHTDatasourceService, useValue: chtDatasourceService },
          { provide: AnalyticsModulesService, useValue: analyticsModulesService },
          { provide: TrainingCardsService, useValue: trainingCardsService },
          { provide: UserSettingsService, useValue: userSettingsService },
          { provide: FormService, useValue: formService },
          { provide: StorageInfoService, useValue: storageInfoService },
          { provide: Router, useValue: router },
        ]
      })
      .overrideComponent(SidebarMenuComponent, {
        set: {
          selector: 'mm-sidebar-menu',
          template: '<div>Sidebar Menu Mock</div>',
        },
      })
      .compileComponents();
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
    clock && clock.restore();
    window.PouchDB = originalPouchDB;
    window.localStorage.removeItem('medic-last-replicated-date');
  });

  it('should create component and init services', async () => {
    await getComponent();
    await component.setupPromise;

    expect(component).to.exist;
    // load translations
    expect(languageService.get.callCount).to.equal(1);
    expect(setLanguageService.set.callCount).to.equal(1);
    // start wealth quintiles
    expect(wealthQuintilesWatcherService.start.callCount).to.equal(1);
    // init count message service
    expect(countMessageService.init.callCount).to.equal(1);
    // init feedback service
    expect(feedbackService.init.callCount).to.equal(1);
    // check privacy policy
    expect(privacyPoliciesService.hasAccepted.callCount).to.equal(1);
    // init rules engine
    expect(rulesEngineService.isEnabled.callCount).to.equal(1);
    // init CHTScriptApiService
    expect(chtDatasourceService.isInitialized.callCount).to.equal(1);
    // init unread count
    expect(unreadRecordsService.init.callCount).to.equal(1);
    expect(unreadRecordsService.init.args[0][0]).to.be.a('Function');
    // check date service
    expect(checkDateService.check.callCount).to.equal(1);
    // start recurring processes
    expect(recurringProcessManagerService.startUpdateRelativeDate.callCount).to.equal(1);
    expect(recurringProcessManagerService.startUpdateReadDocsCount.callCount).to.equal(0);
    expect(component.isSidebarFilterOpen).to.be.false;
    expect(userSettingsService.get.calledOnce).to.equal(true);
    expect(globalActions.setUserFacilityIds.calledOnceWith(['facility'])).to.equal(true);
    expect(globalActions.setUserContactId.calledOnceWith('contact')).to.equal(true);
    expect(updateServiceWorkerService.update.callCount).to.equal(1);
    // init storage info service
    expect(storageInfoService.init.callCount).to.equal(1);
  });

  it('should show reload popup when service worker is updated', async () => {
    await getComponent();
    await component.setupPromise;

    expect(updateServiceWorkerService.update.callCount).to.equal(1);
    const callback = updateServiceWorkerService.update.args[0][0];
    callback();
    expect(modalService.show.calledOnce).to.be.true;
    expect(modalService.show.args[0]).to.have.deep.members([ReloadingComponent]);

  });

  it('should display browser compatibility modal if using outdated chrome browser', async () => {
    browserDetectorService.isUsingOutdatedBrowser.returns(true);
    await getComponent();
    await component.translationsLoaded;

    expect(modalService.show.calledOnce).to.be.true;
    expect(modalService.show.args[0]).to.have.deep.members([BrowserCompatibilityComponent]);
  });

  it('should set hasOldNav to be false by default', fakeAsync(async () => {
    sessionService.isAdmin.returns(false);
    authService.has
      .withArgs(OLD_NAV_PERMISSION)
      .resolves(false);
    await getComponent();
    await component.ngAfterViewInit();
    flush();
    discardPeriodicTasks();

    expect(component.hasOldNav).to.be.false;
  }));

  it('should set hasOldNav to be true if user has permission and is not admin', fakeAsync(async () => {
    sessionService.isAdmin.returns(false);
    authService.has
      .withArgs(OLD_NAV_PERMISSION)
      .resolves(true);
    await getComponent();
    await component.ngAfterViewInit();
    flush();
    discardPeriodicTasks();

    expect(component.hasOldNav).to.be.true;
  }));

  it('should set hasOldNav to be false if user has permission but is admin', fakeAsync(async () => {
    sessionService.isAdmin.returns(true);
    authService.has
      .withArgs(OLD_NAV_PERMISSION)
      .resolves(true);
    await getComponent();
    await component.ngAfterViewInit();
    flush();
    discardPeriodicTasks();

    expect(component.hasOldNav).to.be.false;
  }));

  it('should set isSidebarFilterOpen true when filter state is open', fakeAsync(async () => {
    authService.has.resolves(false);
    await getComponent();
    component.ngAfterViewInit();

    store.overrideSelector(Selectors.getSidebarFilter, { isOpen: true });
    store.refreshState();
    flush();
    discardPeriodicTasks();

    expect(component.isSidebarFilterOpen).to.be.true;
  }));

  it('should subscribe to xmlFormService to retrieve forms and initialize training cards', async () => {
    const form1 = {
      code: '123',
      name: 'something',
      translation_key: 'form1',
      title: 'title',
      icon: 'icon',
      subject_key: '4566'
    };
    const form2 = {
      _id: 'form:456',
      internalId: '456',
      name: 'something',
      translation_key: 'form2',
      title: 'title',
      icon: 'icon',
      subject_key: '7899'
    };
    jsonFormsService.get.resolves([form1]);

    await getComponent();
    await component.setupPromise;
    await component.translationsLoaded;

    expect(jsonFormsService.get.callCount).to.equal(1);
    expect(xmlFormsService.subscribe.callCount).to.equal(1);

    expect(xmlFormsService.subscribe.getCall(0).args[0]).to.equal('FormsFilter');
    expect(xmlFormsService.subscribe.getCall(0).args[1]).to.deep.equal({
      reportForms: true,
      ignoreContext: true,
    });
    expect(xmlFormsService.subscribe.getCall(0).args[2]).to.be.a('Function');
    xmlFormsService.subscribe.getCall(0).args[2](false, [form2]);
    expect(globalActions.setForms.callCount).to.equal(1);
    expect(globalActions.setForms.args[0][0]).to.have.deep.members([
      {
        id: '123',
        code: '123',
        icon: 'icon',
        subjectKey: '4566',
        title: 'form1'
      },
      {
        id: 'form:456',
        code: '456',
        icon: 'icon',
        subjectKey: '7899',
        title: 'form2'
      }
    ]);
    expect(trainingCardsService.initTrainingCards.calledOnce).to.be.true;
  });

  it('should set privacy policy and start modals if privacy accepted', async () => {
    privacyPoliciesService.hasAccepted.resolves({ privacyPolicy: 'The policy...', accepted: false });
    await getComponent();
    await component.setupPromise;

    expect(privacyPoliciesService.hasAccepted.callCount).to.equal(1);
    expect(globalActions.setPrivacyPolicyAccepted.callCount).to.equal(1);
    expect(globalActions.setPrivacyPolicyAccepted.args[0]).to.have.members([false]);
    expect(globalActions.setShowPrivacyPolicy.callCount).to.equal(1);
    expect(globalActions.setShowPrivacyPolicy.args[0]).to.have.members(['The policy...']);

    privacyPoliciesService.hasAccepted.resolves({ privacyPolicy: undefined, accepted: false });
    await getComponent();
    await component.setupPromise;

    expect(globalActions.setPrivacyPolicyAccepted.callCount).to.equal(2);
    expect(globalActions.setPrivacyPolicyAccepted.getCall(1).args).to.have.members([false]);
    expect(globalActions.setShowPrivacyPolicy.callCount).to.equal(2);
    expect(globalActions.setShowPrivacyPolicy.getCall(1).args).to.have.members([undefined]);
  });

  it('should start the UpdateReadDocsCount recurring process for online users', async () => {
    sessionService.isOnlineOnly.returns(true);

    await getComponent();
    await component.setupPromise;

    expect(recurringProcessManagerService.startUpdateReadDocsCount.callCount).to.equal(1);
    expect(transitionsService.init.callCount).to.equal(0);
  });

  it('should start the TransitionsService for offline users', async () => {
    sessionService.isOnlineOnly.returns(false);

    await getComponent();
    await component.setupPromise;

    expect(recurringProcessManagerService.startUpdateReadDocsCount.callCount).to.equal(0);
    expect(transitionsService.init.callCount).to.equal(1);
  });

  it('should set app title', async () => {
    resourceIconsService.getAppTitle.resolves('My App');

    await getComponent();
    await Promise.resolve();

    expect(resourceIconsService.getAppTitle.callCount).to.equal(1);
    expect(document.title).to.equal('My App');
  });

  it('should watch the database connection and show database closed modal', fakeAsync(async () => {
    const observable = new Subject();
    databaseConnectionMonitorService.listenForDatabaseClosed.returns(observable);

    await getComponent();
    observable.next(true);
    flush();
    discardPeriodicTasks();

    expect(databaseConnectionMonitorService.listenForDatabaseClosed.callCount).to.equal(1);
    expect(modalService.show.callCount).to.equal(1);
    expect(modalService.show.args[0]).to.have.deep.members([DatabaseClosedComponent]);
  }));

  describe('Setup DB', () => {
    it('should disable dbsync in replication status', async () => {
      dbSyncService.isEnabled.returns(false);
      window.localStorage.setItem('medic-last-replicated-date', '12345');

      await getComponent();

      expect(globalActions.updateReplicationStatus.callCount).to.equal(2);
      expect(globalActions.updateReplicationStatus.getCall(0).args).to.deep.equal([{
        disabled: false,
        lastTrigger: undefined,
        lastSuccessTo: 12345
      }]);
      expect(globalActions.updateReplicationStatus.getCall(1).args).to.deep.equal([{disabled: true}]);
      expect(dbSyncService.subscribe.callCount).to.equal(1);
    });

    it('should sync db if enabled', async () => {
      clock = sinon.useFakeTimers();
      dbSyncService.isEnabled.returns(true);

      await getComponent();

      expect(globalActions.updateReplicationStatus.callCount).to.equal(1);
      expect(globalActions.updateReplicationStatus.args[0]).to.deep.equal([{
        disabled: false,
        lastTrigger: undefined,
        lastSuccessTo: NaN
      }]);

      clock.tick(10 * 1000);
      await Promise.resolve();

      expect(dbSyncService.sync.callCount).to.equal(1);
      expect(dbSyncService.subscribe.callCount).to.equal(1);
    });

    it('should set dbSync replication status in subcription callback', async () => {
      clock = sinon.useFakeTimers();
      await getComponent();
      component.replicationStatus = {};
      const callback = dbSyncService.subscribe.args[0][0];

      callback({ state: 'disabled' });
      expect(globalActions.updateReplicationStatus.callCount).to.equal(3);
      expect(globalActions.updateReplicationStatus.getCall(2).args).to.deep.equal([{ disabled: true }]);

      callback({ state: 'unknown' });
      expect(globalActions.updateReplicationStatus.callCount).to.equal(4);
      expect(globalActions.updateReplicationStatus.getCall(3).args).to.deep.equal([{
        current: {
          icon: 'fa-info-circle',
          key: 'sync.status.unknown'
        }
      }]);

      callback({ state: 'inProgress' });
      expect(globalActions.updateReplicationStatus.callCount).to.equal(5);
      expect(globalActions.updateReplicationStatus.getCall(4).args).to.deep.equal([{
        lastTrigger: 0,
        current: {
          icon: 'fa-refresh',
          key: 'sync.status.in_progress',
          disableSyncButton: true
        }
      }]);

      callback({ state: '', to: 'success', from: 'success' });
      expect(globalActions.updateReplicationStatus.callCount).to.equal(6);
      expect(globalActions.updateReplicationStatus.getCall(5).args).to.deep.equal([{
        current: {
          icon: 'fa-check',
          key: 'sync.status.not_required',
          className: 'success'
        },
        lastSuccessFrom: 0,
        lastSuccessTo: 0
      }]);

      callback({ state: '', to: 'success', from: 'fail' });
      expect(globalActions.updateReplicationStatus.callCount).to.equal(7);
      expect(globalActions.updateReplicationStatus.getCall(6).args).to.deep.equal([{
        current: {
          icon: 'fa-exclamation-triangle',
          key: 'sync.status.required',
          className: 'required'
        },
        lastSuccessTo: 0
      }]);
    });
  });

  describe('Watch changes', () => {
    it('should watch changes in branding, dbSync, translations, ddoc and user context', async () => {
      await getComponent();

      expect(changesListener['branding-icon']).to.be.an('object');
      expect(changesListener['sync-status']).to.be.an('object');
      expect(changesListener.translations).to.be.an('object');
      expect(changesListener.ddoc).to.be.an('object');
      expect(changesListener['user-context']).to.be.an('object');
    });

    it('user-context change listener should filter only logged in user, if exists', async () => {
      sessionService.userCtx.returns({ name: 'adm', roles: ['alpha', 'omega'] });

      await getComponent();

      expect(changesListener['user-context'].filter({ id: 'something' })).to.equal(false);
      expect(changesListener['user-context'].filter({ id: 'someperson' })).to.equal(false);
      expect(changesListener['user-context'].filter({ id: 'org.couchdb.user:someone' })).to.equal(false);
      expect(changesListener['user-context'].filter({ id: 'org.couchdb.user:adm' })).to.equal(true);

      sessionService.userCtx.returns(false);

      await getComponent();

      expect(changesListener['user-context'].filter({ doc: { type: 'user-settings', name: 'a' }}))
        .to.equal(false);
    });

    it('user-context change listener callback should check current session', async () => {
      await getComponent();

      expect(sessionService.init.callCount).to.equal(1);
      changesListener['user-context'].callback();
      expect(sessionService.init.callCount).to.equal(2);
    });

    it('sync-status change listener callback should do nothing if sync in progress', async () => {
      dbSyncService.isSyncInProgress.returns(true);

      await getComponent();

      expect(changesListener['sync-status']).to.be.an('object');
      changesListener['sync-status'].callback();
      expect(dbSyncService.sync.callCount).to.equal(0);
    });

    it('sync-status change listener callback should call sync if not currently syncing', async () => {
      dbSyncService.isSyncInProgress.returns(false);

      await getComponent();

      expect(changesListener['sync-status']).to.be.an('object');
      changesListener['sync-status'].callback();
      expect(dbSyncService.sync.callCount).to.equal(1);
    });
  });

  describe('language reloading', () => {
    it('filter should only match translations docs', async () => {
      await getComponent();
      const filter = changesListener.translations.filter;
      expect(filter).to.be.a('function');

      expect(filter({ id: 'messages-en' })).to.equal(true);
      expect(filter({ id: 'messages-tl' })).to.equal(true);
      expect(filter({ id: 'not-messages-tl' })).to.equal(false);
      expect(filter({ })).to.equal(undefined);
      expect(filter({ id: 'undefined' })).to.equal(false);
    });

    it('callback should refresh the given locale when not enabled', async () => {
      languageService.get.resolves('enabled_locale');
      await getComponent();
      sinon.resetHistory();
      const callback = changesListener.translations.callback;
      expect(callback).to.be.a('function');

      await callback({ id: 'messages-locale' });

      expect(languageService.get.callCount).to.equal(1);
      expect(translateLocaleService.reloadLang.callCount).to.equal(1);
      expect(translateLocaleService.reloadLang.args[0]).to.deep.equal(['locale', false]);
    });

    it('callback should refresh the given locale when enabled', async () => {
      languageService.get.resolves('enabled_locale');
      await getComponent();
      sinon.resetHistory();
      const callback = changesListener.translations.callback;
      expect(callback).to.be.a('function');

      await callback({ id: 'messages-enabled_locale' });

      expect(languageService.get.callCount).to.equal(1);
      expect(translateLocaleService.reloadLang.callCount).to.equal(1);
      expect(translateLocaleService.reloadLang.args[0]).to.deep.equal(['enabled_locale', true]);
    });
  });

  describe('Initialized Analytics Modules', () => {
    it('should set analytics modules', fakeAsync(async () => {
      analyticsModulesService.get.resolves([{
        id: 'targets',
        label: 'analytics.targets',
        route: [ '/', 'analytics', 'targets' ]
      }]);

      await getComponent();
      flush();
      discardPeriodicTasks();

      expect(consoleErrorStub.callCount).to.equal(0);
      expect(analyticsModulesService.get.callCount).to.equal(1);
      expect(analyticsActions.setAnalyticsModules.callCount).to.equal(1);
      expect(analyticsActions.setAnalyticsModules.args[0]).to.deep.equal([
        [{
          id: 'targets',
          label: 'analytics.targets',
          route: [ '/', 'analytics', 'targets' ]
        }]
      ]);
    }));

    it('should catch exception', fakeAsync(async () => {
      analyticsModulesService.get.throws({ error: 'Oops' });

      await getComponent();
      flush();
      discardPeriodicTasks();

      expect(consoleErrorStub.callCount).to.equal(1);
      expect(consoleErrorStub.args[0]).to.deep.equal([
        'Error while initializing analytics modules',
        { error: 'Oops' }
      ]);
      expect(analyticsModulesService.get.callCount).to.equal(1);
      expect(analyticsActions.setAnalyticsModules.callCount).to.equal(0);
    }));

    it('should redirect to the error page when there is an exception', fakeAsync(async () => {
      chtDatasourceService.isInitialized.throws({ error: 'some error'});

      await getComponent();
      flush();
      discardPeriodicTasks();

      expect(consoleErrorStub.callCount).to.equal(1);
      expect(consoleErrorStub.args[0]).to.deep.equal([
        'Error during initialisation',
        { error: 'some error' }
      ]);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([[ '/error', '503' ]]);
    }));
  });
});
