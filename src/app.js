import onChange from 'on-change';
import * as yup from 'yup';
import axios from 'axios';
import i18next from 'i18next';
import { uniqueId } from 'lodash';
import render from './render.js';
import parse from './rss.js';
import resources from './locales';

const getData = (url) => {
  const proxyUrl = new URL('/get', 'https://allorigins.hexlet.app');
  proxyUrl.searchParams.append('disableCache', 'true');
  proxyUrl.searchParams.append('url', url);
  return axios.get(proxyUrl);
};

const addIds = (posts, feedId) => {
  posts.forEach((post) => {
    post.id = uniqueId();
    post.feedId = feedId;
  });
};

const handleData = (data, watchedState) => {
  const { feed, posts } = data;
  feed.id = uniqueId();
  watchedState.feeds.push(feed);
  addIds(posts, feed.id);
  watchedState.posts.push(...posts);
};

const updatePosts = (watchedState) => {
  const promises = watchedState.feeds.map((feed) => getData(feed.link).then((response) => {
    const { posts } = parse(response.data.contents);
    const postsFromState = watchedState.posts;
    const postsWithCurrentId = postsFromState.filter((post) => post.feedId === feed.id);
    const displayedPostLinks = postsWithCurrentId.map((post) => post.link);
    const newPosts = posts.filter((post) => !displayedPostLinks.includes(post.link));
    addIds(newPosts, feed.id);
    watchedState.posts.unshift(...newPosts);
    // return newPosts;
  }));

  return Promise.all(promises).then(() => setTimeout(updatePosts, 5000, watchedState));
};

const handleError = (error) => {
  if (error.isParsingError) {
    return 'notRss';
  }

  if (axios.isAxiosError(error)) {
    return 'networkError';
  }

  return error.message.key ?? 'unknown';
};

const app = () => {
  yup.setLocale({
    string: {
      url: () => ({ key: 'notUrl' }),
      required: () => ({ key: 'empty' }),
    },
    mixed: {
      notOneOf: () => ({ key: 'alreadyInList' }),
    },
  });

  const state = {
    formState: 'filling',
    error: null,
    feeds: [],
    posts: [],
    uiState: {
      displayedPost: null,
      viewedPostIds: new Set(),
    },
  };

  const elements = {
    form: document.querySelector('.rss-form'),
    urlInput: document.querySelector('#url-input'),
    submit: document.querySelector('[type="submit"]'),
    feedback: document.querySelector('.feedback'),
    postsList: document.querySelector('.posts'),
    feedsList: document.querySelector('.feeds'),
    modalHeader: document.querySelector('.modal-header'),
    modalBody: document.querySelector('.modal-body'),
    modalHref: document.querySelector('.full-article'),
  };

  const i18nextInstance = i18next.createInstance();
  i18nextInstance.init({
    lng: 'ru',
    debug: false,
    resources,
  })
    .then(() => {
      const watchedState = onChange(state, render(state, elements, i18nextInstance));
      const makeSchema = (validatedLinks) => yup.string()
        .required()
        .url()
        .notOneOf(validatedLinks);

      elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const addedLinks = watchedState.feeds.map((feed) => feed.link);
        const schema = makeSchema(addedLinks);
        const formData = new FormData(e.target);
        const input = formData.get('url');
        schema.validate(input)
          .then(() => {
            watchedState.error = null;
            watchedState.formState = 'sending';
            return getData(input);
          })
          .then((response) => {
            const data = parse(response.data.contents, input);
            handleData(data, watchedState);
            watchedState.formState = 'added';
          })
          .catch((error) => {
            watchedState.formState = 'invalid';
            watchedState.error = handleError(error);
          });
      });

      elements.postsList.addEventListener('click', (event) => {
        const currentPost = watchedState.posts.find((post) => post.id === event.target.dataset.id);
        if (currentPost) {
          watchedState.uiState.viewedPostIds.add(currentPost.id);
          watchedState.uiState.displayedPost = currentPost;
        }
      });

      updatePosts(watchedState);
    });
};

export default app;
