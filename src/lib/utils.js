import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export function sanitizeFileName(fileName) {
	if (!fileName) return 'unnamed_file';

	return fileName
		.normalize('NFD')                     // Descomponer caracteres con acentos
		.replace(/[\u0300-\u036f]/g, '')     // Eliminar los acentos
		.replace(/[^a-zA-Z0-9.\-_]/g, '_')    // Reemplazar caracteres especiales por guion bajo
		.replace(/_{2,}/g, '_');              // Evitar múltiples guiones bajos seguidos
}