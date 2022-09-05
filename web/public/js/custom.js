$('[data-toggle="input-mask"]').on('click', e => {
	let $target = $($(e.currentTarget).data('target'));
	let currentState = $target.attr('type');
	if (currentState === 'password') {
		$target.attr('type', 'text');
	} else if (currentState === 'text') {
		$target.attr('type', 'password');
	}
});