import { Injectable } from '@angular/core';
import { Place } from '@medic/cht-datasource';

import { CacheService } from '@mm-services/cache.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { LanguageService } from '@mm-services/language.service';

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  private readonly cache;
  constructor(
    private cacheService:CacheService,
    private getDataRecordsService:GetDataRecordsService,
    private dbService:DbService,
    private languageService:LanguageService,
    private sessionService:SessionService,
  ) {
    this.cache = this.cacheService.register({
      get: callback => {
        const docId = this.userDocId();
        this.dbService.get()
          .get(docId)
          .catch(() => {
            // might be first load - try the remote db
            return dbService.get({ remote: true }).get(docId);
          })
          .then(doc => {
            callback(null, doc);
          })
          .catch(callback);
      },
      invalidate: change => {
        const docId = this.userDocId();
        return change.id === docId;
      }
    });
  }

  private userDocId() {
    const userCtx = this.sessionService.userCtx();
    if (userCtx) {
      return 'org.couchdb.user:' + userCtx.name;
    }
  }

  get(): Promise<UserSettings> {
    const docId = this.userDocId();
    if (!docId) {
      return Promise.reject(new Error('UserCtx not found'));
    }

    return new Promise((resolve, reject) => {
      this.cache((err, userSettings: UserSettings) => {
        if (err) {
          return reject(err);
        }
        resolve(userSettings);
      });
    });
  }

  async hasMultipleFacilities(): Promise<boolean> {
    return this
      .get()
      .then((userSettings: UserSettings) => {
        const userFacility = userSettings.facility_id;
        return Array.isArray(userFacility) && userFacility.length > 1;
      });
  }

  getUserFacilities(): Promise<Place.v1.Place[]> {
    return this
      .get()
      .then((userSettings: UserSettings) => {
        let userFacilities = userSettings.facility_id;
        if (userFacilities && !Array.isArray(userFacilities)) {
          userFacilities = [ userFacilities ];
        }
        return this.getDataRecordsService.get(userFacilities);
      })
      .catch((err) => {
        console.error('Error fetching user facility:', err);
        return [];
      });
  }

  async getWithLanguage(): Promise<Object> {
    const [userSettings, language] = await Promise.all([
      this.get(),
      this.languageService.get()
    ]);
    return { ...userSettings, language };
  }

  put(doc): Promise<Object> {
    return this.dbService
      .get()
      .put(doc);
  }
}

export interface UserSettings {
  _id: string;
  contact_id: string;
  facility_id: string[];
  name: string;
  oidc_login?: boolean;
  roles: string[];
  token_login?: Record<string, unknown>;
  type: string;
}
