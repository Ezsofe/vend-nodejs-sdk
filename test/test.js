'use strict';

var nconf = require('nconf');
//nconf.argv().env();

var chai = require('chai');
var expect = require('chai').expect;

var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

var vendSdk = require('./../vend')({});

describe('vend-nodejs-sdk', function() {/*jshint expr: true*/

    describe('requires proper configuration to run tests', function() {
        it('NODE_ENV must be set', function() {
            expect(process.env.NODE_ENV).to.exist;
            expect(process.env.NODE_ENV).to.be.a('string');
            expect(process.env.NODE_ENV).to.not.be.empty;
        });
        it('a file with client data must be available', function() {
            nconf.file('config', { file: 'config/' + process.env.NODE_ENV + '.json' });

            expect(nconf.get('vend:token_service')).to.exist;
            expect(nconf.get('vend:token_service')).to.be.a('string');
            expect(nconf.get('vend:token_service')).to.not.be.empty;

            expect(nconf.get('vend:client_id')).to.exist;
            expect(nconf.get('vend:client_id')).to.be.a('string');
            expect(nconf.get('vend:client_id')).to.not.be.empty;

            expect(nconf.get('vend:client_secret')).to.exist;
            expect(nconf.get('vend:client_secret')).to.be.a('string');
            expect(nconf.get('vend:client_secret')).to.not.be.empty;
        });
        it('a file with oauth data must be available', function() {
            nconf.file('oauth', { file: 'config/oauth.json' });

            expect(nconf.get('domain_prefix')).to.exist;
            expect(nconf.get('domain_prefix')).to.be.a('string');
            expect(nconf.get('domain_prefix')).to.not.be.empty;

            expect(nconf.get('refresh_token')).to.exist;
            expect(nconf.get('refresh_token')).to.be.a('string');
            expect(nconf.get('refresh_token')).to.not.be.empty;
        });
    });

    describe('when refreshToken is unavailable', function() {

        it('should fail when accessToken is missing', function() {

            var args = vendSdk.args.products.fetch();
            args.orderBy.value = 'id';
            args.page.value = 1;
            args.pageSize.value = 5;
            args.active.value = true;

            var connectionInfo = {
                domainPrefix: nconf.get('domain_prefix')
            };

            /* short hand for testing */
            //var unresolvedPromise = vendSdk.products.fetch(args, connectionInfo);
            //return expect(unresolvedPromise).to.be.rejectedWith('missing required arguments for sendRequest()');

            return vendSdk.products.fetch(args, connectionInfo)
                .catch(function(error){
                    expect(error).to.be.a('string');
                    expect(error).to.equal('missing required arguments for sendRequest()');
                });
        });

        it('should fail when given an incorrect or outdated accessToken', function() {

            var args = vendSdk.args.products.fetch();
            args.orderBy.value = 'id';
            args.page.value = 1;
            args.pageSize.value = 5;
            args.active.value = true;

            var connectionInfo = {
                domainPrefix: nconf.get('domain_prefix'),
                accessToken: nconf.get('access_token') || 'junk'
            };

            return vendSdk.products.fetch(args, connectionInfo)
                .catch(function(error){
                    expect(error).to.be.a('string');
                    expect(error).to.equal('missing required arguments for retryWhenAuthNFails()');
                });
        });

    });

    describe('when a refreshToken is available', function() {

        it('but invalid - API calls should fail', function() {

            var args = vendSdk.args.products.fetch();
            args.orderBy.value = 'id';
            args.page.value = 1;
            args.pageSize.value = 1;
            args.active.value = true;

            var connectionInfo = {
                domainPrefix: nconf.get('domain_prefix'),
                accessToken: 'JUNK',
                refreshToken: 'JUNK',
                vendTokenService: nconf.get('vend:token_service'), // config/<env>.json
                vendClientId: nconf.get('vend:client_id'), // config/<env>.json
                vendClientSecret: nconf.get('vend:client_secret') // config/<env>.json
            };

            return expect( vendSdk.products.fetch(args, connectionInfo) ).to.be.rejectedWith(TypeError);

        });

        it('and valid - can regenerate an accessToken for use in API calls', function() {

            this.timeout(30000);

            var args = vendSdk.args.products.fetch();
            args.orderBy.value = 'id';
            args.page.value = 1;
            args.pageSize.value = 1;
            args.active.value = true;

            var connectionInfo = {
                domainPrefix: nconf.get('domain_prefix'),
                accessToken: 'JUNK', //nconf.get('access_token'),
                refreshToken: nconf.get('refresh_token'), // oauth.json
                vendTokenService: nconf.get('vend:token_service'), // config/<env>.json
                vendClientId: nconf.get('vend:client_id'), // config/<env>.json
                vendClientSecret: nconf.get('vend:client_secret') // config/<env>.json
            };

            return vendSdk.products.fetch(args, connectionInfo)
                .catch(TypeError, function(error){
                    expect(error).to.equal(
                        undefined,
                        'the refresh token might be invalid' +
                        ' \n\t\t look inside vend-nodejs-sdk.log file to confirm' +
                        ' \n\t\t or turn on console logging by using `NODE_ENV=testing ./node_modules/.bin/mocha`' +
                        ' \n\t\t to run the tests and confirm' +
                        ' \n\t\t'
                    );
                });

        });

        it('can fetch products', function() {

            this.timeout(30000);

            var args = vendSdk.args.products.fetch();
            args.orderBy.value = 'id';
            args.page.value = 1;
            args.pageSize.value = 5;
            args.active.value = true;

            var connectionInfo = {
                domainPrefix: nconf.get('domain_prefix'),
                accessToken: 'JUNK', //nconf.get('access_token'),
                refreshToken: nconf.get('refresh_token'), // oauth.json
                vendTokenService: nconf.get('vend:token_service'), // config/<env>.json
                vendClientId: nconf.get('vend:client_id'), // config/<env>.json
                vendClientSecret: nconf.get('vend:client_secret') // config/<env>.json
            };

            return vendSdk.products.fetch(args, connectionInfo)
                .then(function(response){
                    expect(response).to.exist;
                    expect(response.products).to.exist;
                    expect(response.products).to.be.instanceof(Array);
                    expect(response.products).to.have.length.of.at.least(1);
                    expect(response.products).to.have.length.of.at.most(5);
                    if(response.pagination) {/*jshint camelcase: false */
                        expect(response.pagination.results).to.exist;
                        expect(response.pagination.results).to.be.above(0);
                        expect(response.pagination.page).to.exist;
                        expect(response.pagination.page).to.be.equal(1);
                        expect(response.pagination.page_size).to.exist;
                        expect(response.pagination.page_size).to.be.equal(args.pageSize.value);
                        expect(response.pagination.pages).to.exist;
                        expect(response.pagination.pages).to.be.above(0);
                    }
                })
                .catch(TypeError, function(error){
                    expect(error).to.equal(
                        undefined,
                        'the refresh token might be invalid' +
                        ' \n\t\t look inside vend-nodejs-sdk.log file to confirm' +
                        ' \n\t\t or turn on console logging by using `NODE_ENV=testing ./node_modules/.bin/mocha`' +
                        ' \n\t\t to run the tests and confirm' +
                        ' \n\t\t'
                    );
                });

        });

    });

});
