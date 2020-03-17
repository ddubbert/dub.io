import Vue from 'vue';
import Vuex from 'vuex';
import config from '../../../../config';
import subscriptions from '../utils/subscriptions';

import graphqlClient from '../utils/graphql.utils';

const client = graphqlClient(`${config.http}${config.host}:3000/graphql`, `${config.ws}${config.host}:3000/subscriptions`);

Vue.use(Vuex);

let userSub = null;

export default new Vuex.Store({
  state: {
    leaderBoard: [],
    userId: '',
    musicOn: false,
    userStartPosition: { x: 50, y: 50 },
  },
  getters: {
    leaderBoard: (state) => state.leaderBoard,
    userId: (state) => state.userId,
    musicOn: (state) => state.musicOn,
    userStartPosition: (state) => state.userStartPosition,
  },
  mutations: {
    setLeaderBoard(state, leaderBoard) {
      state.leaderBoard = leaderBoard;
    },
    setUserId(state, id) {
      Vue.set(state, 'userId', id);
    },
    setMusic(state, bool) {
      Vue.set(state, 'musicOn', bool);
    },
    setUserStartPosition(state, position) {
      state.userStartPosition.x = position.x;
      state.userStartPosition.y = position.y;
    },
    unsubUser(state) {
      if (state.userId) {
        if (userSub) {
          userSub.unsubscribe();
          userSub = null;
        }

        Vue.set(state, 'userId', '');
      }
    },
  },
  actions: {
    async subscribe({ commit }) {
      try {
        await client.subscribe({
          query: subscriptions.LEADER_BOARD_SUBSCRIPTION,
        }).subscribe({
          next({ data }) {
            commit('setLeaderBoard', data.leaderBoardUpdates.entries);
          },
          error(err) { console.error('err', err); },
        });
      } catch (e) {
        console.error(e);
      }
    },
    async changeDirection({ getters }, direction) {
      try {
        await client.mutate({
          mutation: subscriptions.DIRECTION_MUTATION,
          variables: { userId: getters.userId, direction },
        });
      } catch (e) {
        console.error(e);
      }
    },
    async createUser({ commit, state }, { title, sprite, color }) {
      try {
        if (state.userId) commit('unsubUser');

        const result = await client.mutate({
          mutation: subscriptions.CREATE_USER_MUTATION,
          variables: {
            title,
            color,
            sprite,
            position: state.userStartPosition,
          },
        });

        commit('setUserId', result.data.createUser.id);

        userSub = await client.subscribe({
          query: subscriptions.USER_LOST_SUBSCRIPTION,
          variables: {
            userId: result.data.createUser.id,
          },
        }).subscribe({
          next() {
            commit('unsubUser');
          },
          error(err) { console.error('err', err); },
        });
      } catch (e) {
        console.error(e);
      }
    },
    switchMusic({ commit }, bool) {
      commit('setMusic', bool);
    },
    newUserStartPosition({ commit }, position) {
      commit('setUserStartPosition', position);
    },
  },
  modules: {
  },
});
