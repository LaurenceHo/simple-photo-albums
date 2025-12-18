import { isEmpty } from 'radash';

export const BaseApiRequestService = {
  perform: (
    method: string,
    urlPath: string,
    requestJsonBody?: any,
    urlencodedParams?: any,
    formParams?: any,
  ): Promise<any> => {
    const headers = new Headers({ Accept: '*/*' });

    const requestOptions: any = {};
    requestOptions.mode = 'cors';
    requestOptions.credentials = 'include';
    requestOptions.cache = 'no-cache';

    // Construct request body
    if (!isEmpty(requestJsonBody)) {
      // JSON content
      headers.append('Content-Type', 'application/json');
      requestOptions.body = JSON.stringify(requestJsonBody);
    } else if (!isEmpty(urlencodedParams)) {
      headers.append('Content-Type', 'application/x-www-form-urlencoded');
      const urlSearchParams = new URLSearchParams();
      for (const param of Object.keys(urlencodedParams)) {
        urlSearchParams.append(param, urlencodedParams[param]);
      }
      requestOptions.body = urlSearchParams;
    } else if (!isEmpty(formParams)) {
      const formData = new FormData();
      for (const formParam of Object.keys(formParams)) {
        formData.append(formParam, formParams[formParam]);
      }
      requestOptions.body = formData;
    }

    requestOptions.method = method.toUpperCase();
    requestOptions.headers = headers;

    return fetch(urlPath, requestOptions);
  },
};
