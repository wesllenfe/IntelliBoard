import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.loading()) {
    return auth.isAuthenticated() ? true : router.createUrlTree(['/auth']);
  }

  return toObservable(auth.loading).pipe(
    filter(loading => !loading),
    take(1),
    map(() => auth.isAuthenticated() ? true : router.createUrlTree(['/auth']))
  );
};

export const publicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.loading()) {
    return !auth.isAuthenticated() ? true : router.createUrlTree(['/board']);
  }

  return toObservable(auth.loading).pipe(
    filter(loading => !loading),
    take(1),
    map(() => !auth.isAuthenticated() ? true : router.createUrlTree(['/board']))
  );
};
