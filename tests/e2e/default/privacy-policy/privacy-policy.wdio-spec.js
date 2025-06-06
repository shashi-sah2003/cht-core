const commonPage = require('@page-objects/default/common/common.wdio.page.js');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const privacyPage = require('@page-objects/default/privacy-policy/privacy-policy.wdio.page');
const userFactory = require('@factories/cht/users/users');
const privacyPolicyFactory = require('@factories/cht/settings/privacy-policy');
const placeFactory = require('@factories/cht/contacts/place');

describe('Privacy policy', () => {
  const privacyPolicy = privacyPolicyFactory.privacyPolicy().build();
  const englishTexts = privacyPolicyFactory.english;
  const frenchTexts = privacyPolicyFactory.french;
  const spanishTexts = privacyPolicyFactory.spanish;

  const users = [
    userFactory.build({ username: 'offlineuser', isOffline: true }),
    userFactory.build({ username: 'onlineuser', roles: ['program_officer']})
  ];

  const parent = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });

  users.forEach((user) => {
    describe(`for an ${user.isOffline ? 'offline':'online'} user`, () => {
      before(async () => {
        await commonPage.reloadSession();
        await utils.saveDocs([parent, privacyPolicy]);
        await utils.createUsers([user]);
        await loginPage.login({ username: user.username, password: user.password, privacyPolicy: true });
      });

      after(async () => {
        await utils.deleteUsers([user]);
        await utils.revertDb([/^form:/], true);
      });

      it('should show the correct privacy policy on login', async () => {
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), englishTexts, user.isOffline);
        expect(await commonPage.tabsSelector.messagesTab().isDisplayed()).to.be.true;
      });

      it('should not show on refresh', async () => {
        await browser.url('/');
        await commonPage.tabsSelector.messagesTab().waitForDisplayed();
        expect(await privacyPage.privacyWrapper().isDisplayed()).to.not.be.true;
      });

      it('should display when navigating to the privacy policy page', async () => {
        await privacyPage.goToPrivacyPolicyConfig();
        await privacyPage.waitForPolicy(await privacyPage.privacyConfig(), englishTexts);
      });

      it('should not show on subsequent login', async () => {
        await commonPage.reloadSession();
        await loginPage.login({ username: user.username, password: user.password });
        await commonPage.tabsSelector.messagesTab().waitForDisplayed();
        expect(await privacyPage.privacyWrapper().isDisplayed()).to.not.be.true;
      });

      it('should show french policy on secondary login', async () => {
        await commonPage.reloadSession();
        await loginPage.login({ username: user.username, password: user.password, locale: 'fr', privacyPolicy: true });
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), frenchTexts);
        expect(await commonPage.tabsSelector.messagesTab().isDisplayed()).to.be.true;
      });

      it('should show if the user changes their language', async () => {
        await browser.setCookies({ name: 'locale', value: 'es' });
        await browser.refresh();
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), spanishTexts);
        expect(await commonPage.tabsSelector.messagesTab().isDisplayed()).to.be.true;
      });

      it('should show if the user policy changes', async () => {
        const text = {
          header: 'New privacy policy',
          paragraph: 'This is a new privacy policy',
          language: 'Enlgish Updated'
        };
        const updated = {
          key: 'en_attachment',
          text: privacyPolicyFactory.privacyPolicyHtml(text)
        };
        const updatedPolicy = privacyPolicyFactory.privacyPolicy().build(
          { privacy_policies: { en: updated.key } },
          { attachments: [updated] },
        );

        await browser.setCookies({ name: 'locale', value: 'en' });
        await browser.refresh();

        await privacyPage.updatePrivacyPolicy(updatedPolicy);

        if (user.isOffline) {
          await commonPage.sync();
        }

        await browser.refresh();
        await privacyPage.waitAndAcceptPolicy(await privacyPage.privacyWrapper(), text);

        expect(await commonPage.tabsSelector.messagesTab().isDisplayed()).to.be.true;
      });
    });
  });

  describe('conflicts', () => {
    let passed = false;

    const conflictUser = userFactory.build({
      username: 'newoffline',
      known: false
    });

    before(async () => {
      await utils.saveDocs([parent, privacyPolicy]);
      await utils.createUsers([conflictUser]);
      await commonPage.reloadSession();
      await loginPage.login({ username: conflictUser.username, password: conflictUser.password, privacyPolicy: true });
    });

    afterEach(async () => {
      if (!passed) {
        // I suspect this test is failing because of a conflict.
        const userDoc = await utils.requestOnTestDb('/org.couchdb.user:offline?conflicts=true');
        console.log('Check if the test failed because of a conflict on this doc:');
        console.log(JSON.stringify(userDoc, null, 2));
      }
    });

    it('should not fail due to document conflict for new offline user', async () => {
      await privacyPage.waitForPolicy(await privacyPage.privacyWrapper(), englishTexts);
      await privacyPage.acceptPrivacyPolicy();
      await commonPage.sync();
      expect(await commonPage.tabsSelector.messagesTab().isDisplayed()).to.be.true;
      passed = true;
    });
  });
});
